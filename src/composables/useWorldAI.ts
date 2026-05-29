import { ref } from 'vue';
import { useSettings } from './useSettings';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { WSMessage, WSToolCall, WSToolResult, SuperPowerPlan, SuperPowerStep } from '../types-world-sim';

const MAX_TOOL_ROUNDS = 20;

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function normalizeUrl(base: string, suffix: string) {
  const clean = base.trim().replace(/\/+$/, '');
  return clean.endsWith(suffix) ? clean : `${clean}${suffix}`;
}

export function useWorldAI() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const abortController = ref<AbortController | null>(null);

  const { activeAIConfig } = useSettings();

  function cancel() {
    if (abortController.value) {
      abortController.value.abort();
      abortController.value = null;
    }
    loading.value = false;
  }

  function buildSystemPrompt(): string {
    const cfg = activeAIConfig.value;
    if (!cfg) return '';
    return cfg.systemPrompt.trim();
  }

  // ---- OpenAI / OpenAI-compatible call ----
  async function callOpenAIWithTools(
    messages: Record<string, unknown>[],
    tools: Record<string, unknown>[] | undefined,
    signal: AbortSignal,
  ): Promise<{ content: string; thinking?: string; toolCalls?: WSToolCall[] }> {
    const cfg = activeAIConfig.value;
    if (!cfg) throw new Error('未选择 AI 配置');

    const endpoint = normalizeUrl(cfg.apiUrl, '/chat/completions');
    const body: Record<string, unknown> = {
      model: cfg.model.trim(),
      messages,
    };

    if (!cfg.model.toLowerCase().includes('claude')) {
      body.temperature = cfg.temperature;
    }
    if (tools && tools.length > 0) {
      body.tools = tools;
    }
    if (cfg.enableJsonMode) {
      body.response_format = { type: 'json_object' };
    }
    if (cfg.thinkingLevel) {
      body.reasoning_effort = cfg.thinkingLevel.toLowerCase();
      body.thinking = { type: 'enabled' };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.token.trim()}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || `请求失败：${res.status}`);
    }

    const msg = data?.choices?.[0]?.message as Record<string, unknown> | undefined;
    if (!msg) throw new Error('模型未返回可用内容');

    const text = typeof msg.content === 'string' ? msg.content.trim() : '';
    const thinking = (msg as { reasoning_content?: string })?.reasoning_content
      || (msg as { reasoning?: string })?.reasoning
      || undefined;

    const rawToolCalls = msg.tool_calls as Array<{
      id: string;
      type?: string;
      function: { name: string; arguments: string };
    }> | undefined;

    let toolCalls: WSToolCall[] | undefined;
    if (rawToolCalls && rawToolCalls.length > 0) {
      toolCalls = rawToolCalls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        args: safeParseJson(tc.function.arguments, {}) as Record<string, string>,
      }));
    }

    return {
      content: text,
      thinking: thinking ? String(thinking).trim() : undefined,
      toolCalls,
    };
  }

  // ---- Gemini call ----
  async function callGeminiWithTools(
    contents: { role: string; parts: { text?: string; functionResponse?: { name: string; response: unknown } }[] }[],
    tools: Record<string, unknown>[] | undefined,
    systemInstruction: string,
  ): Promise<{ content: string; thinking?: string; toolCalls?: WSToolCall[] }> {
    const cfg = activeAIConfig.value;
    if (!cfg) throw new Error('未选择 AI 配置');

    const ai = new GoogleGenAI({ apiKey: cfg.token.trim() });
    const config: Record<string, unknown> = {};

    if (systemInstruction) {
      config.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    if (tools && tools.length > 0) {
      config.tools = tools;
    }

    if (cfg.thinkingLevel) {
      const tl = ThinkingLevel[cfg.thinkingLevel as keyof typeof ThinkingLevel];
      if (tl) config.thinkingConfig = { thinkingLevel: tl };
    }

    if (!cfg.model.toLowerCase().includes('claude')) {
      config.temperature = cfg.temperature;
    }

    if (cfg.enableJsonMode) {
      config.responseSchema = { type: 'JSON' };
    }

    const response = await ai.models.generateContent({
      model: cfg.model.trim(),
      contents: contents as any,
      config,
    } as any);

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error('模型未返回可用内容');
    }

    const parts = response.candidates[0]?.content?.parts ?? [];
    const thoughtParts = parts.filter(p => (p as { thought?: boolean }).thought === true);
    const textParts = parts.filter(p => !(p as { thought?: boolean }).thought && !(p as { functionCall?: unknown }).functionCall);
    const functionCallParts = parts.filter(p => !!(p as { functionCall?: unknown }).functionCall);

    const thinking = thoughtParts.length > 0
      ? thoughtParts.map(p => p.text || '').join('\n').trim()
      : undefined;
    const text = textParts.map(p => p.text || '').join('\n').trim();

    let toolCalls: WSToolCall[] | undefined;
    if (functionCallParts.length > 0) {
      toolCalls = functionCallParts.map(p => {
        const fc = p.functionCall as { id?: string; name: string; args: unknown };
        const args = typeof fc.args === 'object' && fc.args !== null
          ? fc.args as Record<string, string>
          : safeParseJson(String(fc.args ?? ''), {}) as Record<string, string>;
        return {
          id: fc.id || generateId(),
          name: fc.name,
          args,
        };
      });
    }

    return { content: text, thinking, toolCalls };
  }

  // ---- Normal mode: single message exchange ----
  async function sendNormalMessage(
    userContent: string,
    fullSystemPrompt: string,
    previousMessages: WSMessage[],
  ): Promise<{ content: string; thinking?: string }> {
    const cfg = activeAIConfig.value;
    if (!cfg) throw new Error('未选择 AI 配置');

    error.value = null;
    loading.value = true;
    abortController.value = new AbortController();
    const signal = abortController.value.signal;

    try {
      if (cfg.provider === 'gemini') {
        const contents = [
          ...previousMessages.map(m => wsToGeminiContent(m)),
          { role: 'user' as const, parts: [{ text: userContent }] },
        ];

        const result = await callGeminiWithTools(contents, undefined, fullSystemPrompt);
        return { content: result.content, thinking: result.thinking };
      }

      // OpenAI / OpenAI-like
      const messages: Record<string, unknown>[] = [
        ...(fullSystemPrompt ? [{ role: 'system', content: fullSystemPrompt }] : []),
        ...previousMessages.map(m => wsToOpenAiMessage(m)),
        { role: 'user', content: userContent },
      ];

      const result = await callOpenAIWithTools(messages, undefined, signal);
      return { content: result.content, thinking: result.thinking };
    } finally {
      loading.value = false;
      abortController.value = null;
    }
  }

  // ---- Guided generation: AI asks a guiding question ----
  async function sendGuidedQuestion(
    context: string,
    fullSystemPrompt: string,
    previousMessages: WSMessage[],
  ): Promise<{ content: string; thinking?: string }> {
    const guidedPrompt = `你是一位专业的小说创作导师。请根据当前上下文，向作者提出引导性问题或创作建议，帮助作者理清思路、完善设定或推进剧情。

${context}

请提出1-3个有深度的问题或建议，帮助作者进行下一步创作。`;

    return sendNormalMessage(guidedPrompt, fullSystemPrompt, previousMessages);
  }

  // ---- Guided generation: generate content after author confirms ----
  async function sendGuidedGeneration(
    instruction: string,
    fullSystemPrompt: string,
    previousMessages: WSMessage[],
  ): Promise<{ content: string; thinking?: string }> {
    const genPrompt = `请根据以下创作指令和上下文，生成小说内容。确保内容连贯、生动、符合设定。

创作指令：
${instruction}

请直接开始创作，不需要额外的解释或引导。`;

    return sendNormalMessage(genPrompt, fullSystemPrompt, previousMessages);
  }

  // ---- Super Power mode: plan + execute tool loop ----
  async function sendSuperPowerMessage(
    userContent: string,
    fullSystemPrompt: string,
    previousMessages: WSMessage[],
    toolDefs: Record<string, unknown>[],
    executeTool: (name: string, args: Record<string, string>) => string,
    onStepUpdate: (step: SuperPowerStep) => void,
  ): Promise<{
    content: string;
    thinking?: string;
    plan?: SuperPowerPlan;
    toolResults?: WSToolResult[];
  }> {
    const cfg = activeAIConfig.value;
    if (!cfg) throw new Error('未选择 AI 配置');

    error.value = null;
    loading.value = true;
    abortController.value = new AbortController();
    const signal = abortController.value.signal;

    const allToolResults: WSToolResult[] = [];
    const plan: SuperPowerPlan = {
      id: generateId(),
      goal: userContent,
      steps: [],
    };

    try {
      const superSystemPrompt = `${fullSystemPrompt ? fullSystemPrompt + '\n\n' : ''}你是一位专业的小说创作 AI 助手。你需要通过以下流程完成任务：

1. **制定计划**：分析用户的请求，制定一个详细的分步执行计划。
2. **逐步执行**：按计划分步执行。当你需要获取小说中的信息时，使用提供的工具函数。
3. **生成内容**：基于收集到的所有信息，生成最终的完整内容。

你可以使用以下工具来获取小说数据：read_chapter（读取章节）、read_character（读取角色）、read_location（读取场景）、read_item（读取物品）。

每次使用工具后，请等待工具结果，然后根据结果继续执行或使用更多工具。收集到足够信息后，生成最终内容。`;

      let currentMessages: Record<string, unknown>[] = [];
      let currentContents: { role: string; parts: { text?: string; functionResponse?: { name: string; response: unknown } }[] }[] = [];

      if (cfg.provider === 'gemini') {
        currentContents = [
          ...previousMessages.map(m => wsToGeminiContent(m)),
          { role: 'user' as const, parts: [{ text: userContent }] },
        ];
      } else {
        currentMessages = [
          { role: 'system', content: superSystemPrompt },
          ...previousMessages.map(m => wsToOpenAiMessage(m)),
          { role: 'user', content: userContent },
        ];
      }

      let round = 0;
      let finalContent = '';
      let finalThinking: string | undefined;

      while (round < MAX_TOOL_ROUNDS) {
        if (signal.aborted) throw new Error('请求已取消');
        round++;

        let result: { content: string; thinking?: string; toolCalls?: WSToolCall[] };

        if (cfg.provider === 'gemini') {
          result = await callGeminiWithTools(currentContents, toolDefs, superSystemPrompt);
        } else {
          result = await callOpenAIWithTools(currentMessages, toolDefs, signal);
        }

        // No tool calls - the AI produced final content
        if (!result.toolCalls || result.toolCalls.length === 0) {
          finalContent = result.content;
          finalThinking = result.thinking;
          break;
        }

        // Process tool calls
        for (const tc of result.toolCalls) {
          const step: SuperPowerStep = {
            stepNumber: plan.steps.length + 1,
            description: `调用工具: ${tc.name}`,
            status: 'in-progress',
            toolName: tc.name,
            toolArgs: tc.args,
          };
          plan.steps.push(step);
          onStepUpdate(step);

          try {
            const toolResult = executeTool(tc.name, tc.args);
            const toolResultObj: WSToolResult = {
              toolCallId: tc.id,
              name: tc.name,
              result: toolResult,
            };
            allToolResults.push(toolResultObj);

            step.status = 'completed';
            step.toolResult = toolResult;
            onStepUpdate(step);

            // Append tool result for the next round
            if (cfg.provider === 'gemini') {
              const parts: { text?: string; thought?: boolean; functionResponse?: { name: string; response: unknown } }[] = [];
              if (result.thinking) parts.push({ text: result.thinking, thought: true });
              parts.push({
                functionResponse: {
                  name: tc.name,
                  response: safeParseJson(toolResult, { raw: toolResult }),
                },
              });
              currentContents.push({ role: 'model', parts });
            } else {
              const assistantMsg: Record<string, unknown> = {
                role: 'assistant',
                content: result.content || '',
                tool_calls: [{
                  id: tc.id,
                  type: 'function',
                  function: { name: tc.name, arguments: JSON.stringify(tc.args) },
                }],
              };
              if (result.thinking) assistantMsg.reasoning_content = result.thinking;
              currentMessages.push(assistantMsg);
              currentMessages.push({
                role: 'tool',
                tool_call_id: tc.id,
                content: toolResult,
              });
            }
          } catch (e) {
            step.status = 'error';
            step.toolResult = String(e);
            onStepUpdate(step);
          }
        }

        // If we also got text content alongside tool calls, include it
        if (result.content && result.content.length > 0) {
          if (cfg.provider === 'gemini') {
            const parts: { text?: string; thought?: boolean }[] = [];
            if (result.thinking) parts.push({ text: result.thinking, thought: true });
            parts.push({ text: result.content });
            currentContents.push({ role: 'model', parts });
          } else {
            const msg: Record<string, unknown> = { role: 'assistant', content: result.content };
            if (result.thinking) msg.reasoning_content = result.thinking;
            currentMessages.push(msg);
          }
        }
      }

      if (!finalContent) {
        finalContent = '已达到最大执行步骤限制。请简化您的请求并重试。';
      }

      return {
        content: finalContent,
        thinking: finalThinking,
        plan: plan.steps.length > 0 ? plan : undefined,
        toolResults: allToolResults.length > 0 ? allToolResults : undefined,
      };
    } catch (e) {
      if (signal.aborted) throw new Error('请求已取消');
      throw e;
    } finally {
      loading.value = false;
      abortController.value = null;
    }
  }

  return {
    loading,
    error,
    cancel,
    buildSystemPrompt,
    sendNormalMessage,
    sendGuidedQuestion,
    sendGuidedGeneration,
    sendSuperPowerMessage,
  };
}

/** Convert a WSMessage to an OpenAI-compatible message dict, preserving reasoning_content */
function wsToOpenAiMessage(m: WSMessage): Record<string, unknown> {
  const msg: Record<string, unknown> = { role: m.role, content: m.content };
  if (m.role === 'assistant' && m.thinking) {
    msg.reasoning_content = m.thinking;
  }
  return msg;
}

/** Convert a WSMessage to a Gemini-compatible content part, preserving thought parts */
function wsToGeminiContent(m: WSMessage): { role: string; parts: { text?: string; thought?: boolean }[] } {
  const role = m.role === 'assistant' ? 'model' : 'user';
  const parts: { text?: string; thought?: boolean }[] = [];
  if (m.thinking) {
    parts.push({ text: m.thinking, thought: true });
  }
  parts.push({ text: m.content });
  return { role, parts };
}

function safeParseJson(text: string, fallback: Record<string, unknown>): Record<string, unknown> {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch { /* ignore */ }
  return fallback;
}
