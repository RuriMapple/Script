// ==UserScript==
// @name         OpenAI兼容
// @description  OpenAI兼容插件(自动保存、知识库检索、语义压缩、状态栏自动更新及RAG热注入)
// @version      1.9.97
// @author       Sy
// @updateUrl    https://raw.githubusercontent.com/RuriMapple/Script/main/ai-rp.js
// @timestamp    2026-4-26
// @license      MIT
// ==/UserScript==

if (!seal.ext.find("AI-role")) {
  const ext = seal.ext.new("AI-role", "Sy", "1.9.97"); 
  seal.ext.register(ext);
  
    async function safeFetchWithTimeout(url, options, timeoutMs = 30000) {
  let timerId;
  const timeoutPromise = new Promise((_, reject) => 
    timerId = setTimeout(() => reject(new Error("请求超时")), timeoutMs)
  );
  return Promise.race([fetch(url, options), timeoutPromise])
    .finally(() => clearTimeout(timerId));
}

  // 配置项注册
  seal.ext.registerStringConfig(ext, "API密钥", "sk-xxx");
  seal.ext.registerStringConfig(ext, "API端点", "https" + "://api.openai.com/v1/chat/completions");
  seal.ext.registerStringConfig(ext, "模型名称", "");
  
  // 公开API配置项
  seal.ext.registerStringConfig(ext, "公开API密钥", "");
  seal.ext.registerStringConfig(ext, "公开API端点", "");
  seal.ext.registerStringConfig(ext, "公开模型名称", "");

  seal.ext.registerStringConfig(ext, "模组", "");
  seal.ext.registerStringConfig(ext, "外部模组服务地址", "http" + "://127.0.0.1:8080/modules/"); 
  seal.ext.registerStringConfig(ext, "角色卡", ""); 
  seal.ext.registerStringConfig(ext, "角色卡正则", ""); 
  seal.ext.registerStringConfig(ext, "最大回复tokens数", "1000");
  seal.ext.registerStringConfig(ext, "最大回复字符数", "1000");
  seal.ext.registerStringConfig(ext, "存储上下文轮数", "6");
  seal.ext.registerStringConfig(ext, "系统提示", "");
  seal.ext.registerStringConfig(ext, "触发关键词", "（会在导出会话里被过滤）");
  seal.ext.registerStringConfig(ext, "其他触发词", "");
  seal.ext.registerStringConfig(ext, "屏蔽词", ""); 
  seal.ext.registerStringConfig(ext, "清除触发词", "清除记忆");
  seal.ext.registerStringConfig(ext, "清除成功提示", "对话记忆已重置");
  seal.ext.registerBoolConfig(ext, "启用引用回复", true);
  seal.ext.registerBoolConfig(ext, "启用流式请求", false);
  seal.ext.registerBoolConfig(ext, "启用纯净模式", true);
  seal.ext.registerBoolConfig(ext, "过滤身份识别码", false);
  seal.ext.registerBoolConfig(ext, "开启识别图片", false); 
  seal.ext.registerBoolConfig(ext, "开启调试模式", false); 
  seal.ext.registerBoolConfig(ext, "开启联网请求", false); 
  seal.ext.registerBoolConfig(ext, "向知识库推送模组", false); 
  
  // === 联网抓取参数 ===
  seal.ext.registerStringConfig(ext, "Serper搜索API密钥", ""); 
  seal.ext.registerStringConfig(ext, "联网最大迭代次数", "3"); 
  seal.ext.registerStringConfig(ext, "网页抓取最大字符数", "4000"); 
  seal.ext.registerStringConfig(ext, "联网请求前缀", "请根据以下用户的提问，使用搜索工具查找最新相关信息，然后**仅仅返回你认为最相关的网页链接列表**，无需任何多余的解释和客套话：\n"); 

  // === 知识库热更新与检索相关配置 ===
  seal.ext.registerBoolConfig(ext, "开启知识库同步", false);
  seal.ext.registerStringConfig(ext, "知识库同步API", "");

  // === 知识库检索与解耦生成相关配置 ===
  seal.ext.registerBoolConfig(ext, "开启知识库检索", false);
  seal.ext.registerStringConfig(ext, "知识库检索API", "");
  seal.ext.registerStringConfig(ext, "语义压缩前缀", "请提取以下用户输入的核心内容与意图，以利于向量检索（无需任何解释和客套话，直接返回短语）：\n");
  seal.ext.registerStringConfig(ext, "状态栏生成前缀", "请根据最新一轮AI的回答，结合原有的代码块状态，生成最新的状态栏，且必须使用```代码块包裹返回：\n");

  seal.ext.registerStringConfig(ext, "临时会话数量", "50");
  seal.ext.registerStringConfig(ext, "图片转码API", "");

  seal.ext.registerStringConfig(ext, "温度(Temperature)", "0.7");
  seal.ext.registerStringConfig(ext, "Top-p", "1.0");
  seal.ext.registerStringConfig(ext, "Top-k", "40");
  seal.ext.registerStringConfig(ext, "Presence Penalty", "0.0");
  seal.ext.registerStringConfig(ext, "Frequency Penalty", "0.0");
  seal.ext.registerStringConfig(ext, "随机种子(Seed)", "-1");
  seal.ext.registerStringConfig(ext, "深度", "0");
  
  // === 系统级独立动态锚定项 ===
  seal.ext.registerStringConfig(ext, "固定角色设定", "");
  seal.ext.registerStringConfig(ext, "固定角色设定深度", "0");
  seal.ext.registerStringConfig(
    ext,
    "虚构角色历史",
    "system: \nuser: \nassistant: "
  );
  seal.ext.registerStringConfig(
    ext,
    "后置虚构角色历史",
    "user: \nassistant: "
  );

  seal.ext.registerStringConfig(
    ext,
    "虚构历史记录",
    "system: \nuser: \nassistant: "
  );
  seal.ext.registerStringConfig(
    ext,
    "后置虚构历史记录",
    "user: \nassistant: "
  );
  seal.ext.registerStringConfig(ext, "固定锚定配置项0", "");
  seal.ext.registerStringConfig(ext, "固定锚定配置项1", "");
  seal.ext.registerStringConfig(ext, "固定锚定配置项2", "");
  seal.ext.registerStringConfig(ext, "固定锚定配置项3", "");
  seal.ext.registerStringConfig(ext, "固定锚定配置项4", "");

  class DynamicConfig {
    constructor(ext) {
      this.ext = ext;
      this.refresh();
    }
    refresh() {
      this.apiKey = seal.ext.getStringConfig(this.ext, "API密钥");
      this.apiUrl = seal.ext.getStringConfig(this.ext, "API端点");
      this.modelName = seal.ext.getStringConfig(this.ext, "模型名称");
      this.publicApiKey = seal.ext.getStringConfig(this.ext, "公开API密钥");
      this.publicApiUrl = seal.ext.getStringConfig(this.ext, "公开API端点");
      this.publicModelName = seal.ext.getStringConfig(this.ext, "公开模型名称");
      this.maxTokens = parseInt(seal.ext.getStringConfig(this.ext, "最大回复tokens数")) || 1000;
      this.maxChars = parseInt(seal.ext.getStringConfig(this.ext, "最大回复字符数")) || 1000;
      const roundsStr = seal.ext.getStringConfig(this.ext, "存储上下文轮数");
      this.contextRounds = roundsStr === "" ? null : (parseInt(roundsStr) || 6); 
      this.systemPrompt = seal.ext.getStringConfig(this.ext, "系统提示");
      this.triggerWord = seal.ext.getStringConfig(this.ext, "触发关键词");
      const otherTriggersStr = seal.ext.getStringConfig(this.ext, "其他触发词") || "";
      this.otherTriggerWords = otherTriggersStr.split(" ").filter((w) => w.trim() !== "");
      this.blockWords = (seal.ext.getStringConfig(this.ext, "屏蔽词") || "").split(" ").filter((w) => w.trim() !== "");
      this.useReply = seal.ext.getBoolConfig(this.ext, "启用引用回复");
      this.enableStream = seal.ext.getBoolConfig(this.ext, "启用流式请求");
      this.pureModeEnabled = seal.ext.getBoolConfig(this.ext, "启用纯净模式");
      this.filterIdEnabled = seal.ext.getBoolConfig(this.ext, "过滤身份识别码");
      this.enableImage = seal.ext.getBoolConfig(this.ext, "开启识别图片"); 
      this.debugMode = seal.ext.getBoolConfig(this.ext, "开启调试模式"); 
      this.enableNetwork = seal.ext.getBoolConfig(this.ext, "开启联网请求"); 
      this.pushModuleToKB = seal.ext.getBoolConfig(this.ext, "向知识库推送模组");
      this.serperApiKey = seal.ext.getStringConfig(this.ext, "Serper搜索API密钥"); 
      this.networkPrefix = seal.ext.getStringConfig(this.ext, "联网请求前缀");
      
      this.maxNetworkIterations = parseInt(seal.ext.getStringConfig(this.ext, "联网最大迭代次数")) || 3;
      this.webpageMaxLength = parseInt(seal.ext.getStringConfig(this.ext, "网页抓取最大字符数")) || 4000;

      this.enableKBSync = seal.ext.getBoolConfig(this.ext, "开启知识库同步");
      this.kbSyncApi = seal.ext.getStringConfig(this.ext, "知识库同步API");

      this.enableKBQuery = seal.ext.getBoolConfig(this.ext, "开启知识库检索");
      this.kbQueryApi = seal.ext.getStringConfig(this.ext, "知识库检索API");
      this.semanticPrefix = seal.ext.getStringConfig(this.ext, "语义压缩前缀");
      this.statusBarPrefix = seal.ext.getStringConfig(this.ext, "状态栏生成前缀");

      this.imgTransApi = seal.ext.getStringConfig(this.ext, "图片转码API");
      this.clearCmd = seal.ext.getStringConfig(this.ext, "清除触发词");
      this.clearMsg = seal.ext.getStringConfig(this.ext, "清除成功提示");
      this.temperature = parseFloat(seal.ext.getStringConfig(this.ext, "温度(Temperature)")) || 0.7;
      this.top_p = parseFloat(seal.ext.getStringConfig(this.ext, "Top-p")) || 1.0;
      this.top_k = parseInt(seal.ext.getStringConfig(this.ext, "Top-k")) || 40;
      this.presence_penalty = parseFloat(seal.ext.getStringConfig(this.ext, "Presence Penalty")) || 0.0;
      this.frequency_penalty = parseFloat(seal.ext.getStringConfig(this.ext, "Frequency Penalty")) || 0.0;
      this.seed = parseInt(seal.ext.getStringConfig(this.ext, "随机种子(Seed)")) || 12345;
      this.depth = parseInt(seal.ext.getStringConfig(this.ext, "深度")) || 0;
      
      this.fixedRoleSetting = seal.ext.getStringConfig(this.ext, "固定角色设定");
      this.fixedRoleSettingDepth = parseInt(seal.ext.getStringConfig(this.ext, "固定角色设定深度")) || 0;
      this.fictionRoleHistory = seal.ext.getStringConfig(this.ext, "虚构角色历史");
      this.postFictionRoleHistory = seal.ext.getStringConfig(this.ext, "后置虚构角色历史");

      this.fictionHistory = seal.ext.getStringConfig(this.ext, "虚构历史记录");
      this.postFictionHistory = seal.ext.getStringConfig(this.ext, "后置虚构历史记录");
      this.moduleData = seal.ext.getStringConfig(this.ext, "模组");
      this.moduleBaseUrl = seal.ext.getStringConfig(this.ext, "外部模组服务地址"); 
      this.maxTempSessions = parseInt(seal.ext.getStringConfig(this.ext, "临时会话数量")) || 50;

      this.fixedAnchors = {};
      for (let d = 0; d < 5; d++) {
        this.fixedAnchors[d] = seal.ext.getStringConfig(this.ext, "固定锚定配置项" + d);
      }
    }
  }

  class AnchorConfig {
    constructor() {
      this.fictionHistory = [];
      this.systemPrompt = [];
      this.postFictionHistory = [];
      this.fictionRoleHistory = [];
      this.postFictionRoleHistory = [];
    }
    refresh(config) {
      const parseHistory = (content, defaultType = "core") => {
        if (!content) return [];
        return content
          .split("\n")
          .filter((line) => {
            const parts = line.split(":").map((p) => p.trim());
            return (
              parts.length >= 2 &&
              ["system", "user", "assistant"].includes(parts[0])
            );
          })
          .map((line) => {
            const parts = line.split(":");
            return {
              role: parts[0].trim(),
              content: parts.slice(1).join(":").trim(),
              _type: defaultType,
            };
          });
      };
      this.fictionHistory = parseHistory(config.fictionHistory);
      this.systemPrompt = config.systemPrompt
        ? [{ role: "system", content: config.systemPrompt, _type: "core" }]
        : [];
      this.postFictionHistory = parseHistory(config.postFictionHistory);
      this.fictionRoleHistory = parseHistory(config.fictionRoleHistory, "fixed_role_fiction");
      this.postFictionRoleHistory = parseHistory(config.postFictionRoleHistory, "fixed_role_post_fiction");
    }
    get coreMessages() {
      return [...this.fictionHistory, ...this.systemPrompt, ...this.postFictionHistory];
    }
  }

  class ChatGPTSession {
    constructor(config) {
      this.config = config;
      this.anchor = new AnchorConfig();
      this.anchor.refresh(config);
      this.lockedContents = { module: null, roleCards: {}, order: [] };
      this.dynamicContent = [];
      this.fullHistory = [];
      this.ragContext = null; 
      this.webSearchContext = null; 
      
      this.isGenerating = false;
      this.abortController = null;
      this.pendingUserMessages = [];

      this.personalConfig = { 
  apiUrl: null, apiKey: null, modelName: null, 
  pureModeEnabled: null, useReply: null, enableStream: null,
  temperature: null, top_p: null, top_k: null,
  presence_penalty: null, frequency_penalty: null, seed: null,
  depth: null, filterIdEnabled: null, enableImage: null, debugMode: null, 
  enableNetwork: null, pushModuleToKB: null, maxNetworkIterations: null, webpageMaxLength: null,
  enableKBSync: null, kbSyncApi: null,
  enableKBQuery: null, kbQueryApi: null,
  maxTokens: null, maxChars: null, contextRounds: null, systemPrompt: null,
  moduleBaseUrl: null, moduleData: null, fixedAnchors: {}
};
    }
    lockModule(content) {
      if (content) {
        this.lockedContents.module = { content: content, timestamp: Date.now() };
        this.fullHistory = this.fullHistory.filter((m) => m._type !== "locked_module");
        this._addToFullHistory("system", content, "locked_module");
        this.lockedContents.order = [...this.lockedContents.order.filter((k) => k !== "module"), "module"];
      }
    }
    lockRoleCard(cardNum, content) {
      if (content) {
        const cardKey = String(cardNum);
        this.lockedContents.roleCards[cardKey] = { content: content, timestamp: Date.now() };
        const key = `roleCard_${cardKey}`;
        this.fullHistory = this.fullHistory.filter((m) => m._type !== `locked_rolecard_${cardKey}`);
        this._addToFullHistory("system", content, `locked_rolecard_${cardKey}`);
        this.lockedContents.order = [...this.lockedContents.order.filter((k) => k !== key), key];
      }
    }
    clearLockedContent(type, key = "") {
      if (type === "module") {
        this.lockedContents.module = null;
        this.lockedContents.order = this.lockedContents.order.filter(k => k !== "module");
        this.fullHistory = this.fullHistory.filter(m => m._type !== "locked_module");
      } else if (type === "roleCard") {
        const cardKey = String(key);
        delete this.lockedContents.roleCards[cardKey];
        const orderKey = `roleCard_${cardKey}`;
        this.lockedContents.order = this.lockedContents.order.filter(k => k !== orderKey);
        this.fullHistory = this.fullHistory.filter(m => m._type !== `locked_rolecard_${cardKey}`);
      }
    }
    clearAllRoleCards() {
      this.lockedContents.roleCards = {};
      this.lockedContents.order = this.lockedContents.order.filter(k => !k.startsWith("roleCard_"));
      this.fullHistory = this.fullHistory.filter(m => !m._type || !m._type.startsWith("locked_rolecard_"));
    }
    _addToFullHistory(role, content, type) {
      this.fullHistory.push({ role: role, content: content, _type: type, timestamp: Date.now() });
    }
    addDynamicMessage(role, content, filteredContent = null, userId = null) {
      let messageContent = content;
      if (role === "user" && userId) {
        messageContent = `(${userId}) ${content}`;
      }
      const message = {
        role: role === "assistant" ? "assistant" : "user",
        content: messageContent,
        _type: "dynamic",
        timestamp: Date.now(),
        filteredContent: filteredContent,
      };
      this.fullHistory.push(message);
      this.dynamicContent.push(message);
    }
    buildPayload() {
      this.anchor.refresh(this.config);
      const lockedMessages = this.lockedContents.order
        .map((key) => {
          if (key === "module") {
            return this.lockedContents.module
              ? { role: "system", content: this.lockedContents.module.content, _type: "locked_module" }
              : null;
          } else {
            const cardKey = key.substring(9); 
            return this.lockedContents.roleCards[cardKey]
              ? { role: "system", content: `<investigator>\n${this.lockedContents.roleCards[cardKey].content}\n</investigator>`, _type: `locked_rolecard_${cardKey}` }
              : null;
          }
        })
        .filter((m) => m);
        
      const pConfig = this.personalConfig || {};
      
      const coreMsgs = pConfig.systemPrompt 
        ? [{ role: "system", content: pConfig.systemPrompt, _type: "personal_system" }] 
        : this.anchor.coreMessages;

      if (this.ragContext) {
          coreMsgs.push({ role: "system", content: this.ragContext, _type: "rag_context" });
      }

      if (this.webSearchContext) {
          coreMsgs.push({ role: "user", content: this.webSearchContext, _type: "web_search_context" });
      }

      const anchorGroup = [...lockedMessages, ...coreMsgs];
      let originalDynamic = this.dynamicContent;
      const rounds = (pConfig.contextRounds !== null && pConfig.contextRounds !== undefined) ? pConfig.contextRounds : this.config.contextRounds;
      if (rounds !== null && rounds !== undefined) {
        const messagesToKeep = rounds * 2;
        if (originalDynamic.length > messagesToKeep) {
          originalDynamic = originalDynamic.slice(-messagesToKeep);
        }
      }

      let dynamicClone = JSON.parse(JSON.stringify(originalDynamic));
      
      const anchorsInsertion = [];

      // 第一步：【最高优先级】处理固定角色设定和自定义锚定项
      // 只有在没设置“系统提示”指令时，才加载全局的固定设定
      if (!pConfig.systemPrompt) {
        const hasRoleSetting = this.config.fixedRoleSetting && this.config.fixedRoleSetting.trim() !== "";
        const fictionRole = this.anchor.fictionRoleHistory || [];
        const postFictionRole = this.anchor.postFictionRoleHistory || [];

        if (hasRoleSetting || fictionRole.length > 0 || postFictionRole.length > 0) {
          const roleDepth = this.config.fixedRoleSettingDepth;
          const roleIndex = Math.max(0, Math.min(dynamicClone.length, dynamicClone.length - roleDepth));

          let roleMessages = [];
          if (fictionRole.length > 0) roleMessages.push(...fictionRole);
          if (hasRoleSetting) roleMessages.push({ role: "system", content: this.config.fixedRoleSetting, _type: "fixed_role_setting" });
          if (postFictionRole.length > 0) roleMessages.push(...postFictionRole);

          anchorsInsertion.push({ index: roleIndex, messages: roleMessages });
        }

        for (let d = 0; d < 5; d++) {
          const fixedContent = (pConfig.fixedAnchors && pConfig.fixedAnchors[d] !== undefined) 
                               ? pConfig.fixedAnchors[d] 
                               : this.config.fixedAnchors[d];
          
          if (fixedContent && fixedContent.trim() !== "") {
            let parsedAnchor = fixedContent.replace(/\{{1,2}随机数\}{1,2}/g, () => Math.floor(Math.random() * 100) + 1);
            let targetIndex = dynamicClone.length - d;
            if (targetIndex < 0) targetIndex = 0;
            anchorsInsertion.push({
              index: targetIndex,
              messages: [{ role: "system", content: parsedAnchor, _type: `fixed_anchor_${d}` }]
            });
          }
        }
      }

      // 第二步：【次高优先级】处理模组、角色卡、上下文合并组 (anchorGroup)
      // 这一步确保模组紧跟在角色设定后面，而不是抢在它前面
      const userDepth = (pConfig.depth !== null && pConfig.depth !== undefined) ? pConfig.depth : this.config.depth;
      const variableIndex = Math.max(0, Math.min(dynamicClone.length, dynamicClone.length - userDepth));
      anchorsInsertion.push({ index: variableIndex, messages: anchorGroup });

      
      const anchorsMap = new Map();
      anchorsInsertion.forEach((item) => {
        if (anchorsMap.has(item.index)) {
          anchorsMap.get(item.index).push(...item.messages);
        } else {
          anchorsMap.set(item.index, [...item.messages]); 
        }
      });
      
      const insertionIndices = Array.from(anchorsMap.keys()).sort((a, b) => a - b);
      let mergedMessages = [];
      let lastIndex = 0;
      for (const idx of insertionIndices) {
        mergedMessages.push(...dynamicClone.slice(lastIndex, idx));
        mergedMessages.push(...anchorsMap.get(idx));
        lastIndex = idx;
      }
      mergedMessages.push(...dynamicClone.slice(lastIndex));
      
      const isPureMode = (pConfig.pureModeEnabled !== null && pConfig.pureModeEnabled !== undefined) ? pConfig.pureModeEnabled : this.config.pureModeEnabled;
      
      if (isPureMode) {
        let dynamicIndices = [];
        mergedMessages.forEach((msg, idx) => {
          if (msg._type === "dynamic") {
            dynamicIndices.push(idx);
          }
        });
        const keepIndices = dynamicIndices.slice(-4); 

        mergedMessages = mergedMessages.map((msg, idx) => {
          if (msg._type === "dynamic" && !keepIndices.includes(idx)) {
            const { pureText } = filterContent(msg.content);
            return { ...msg, content: pureText };
          }
          return msg;
        });
      }

      const isFilterId = (pConfig.filterIdEnabled !== null && pConfig.filterIdEnabled !== undefined)
        ? pConfig.filterIdEnabled
        : this.config.filterIdEnabled;
      if (isFilterId) {
        mergedMessages = mergedMessages.map((msg) => {
          if (msg._type === "dynamic" && msg.role === "user") {
            if (typeof msg.content === 'string') {
               return { ...msg, content: msg.content.replace(/^\(QQ:\d+\)\s*/i, "") };
            }
          }
          return msg;
        });
      }

      return mergedMessages.filter((m) => m).map(({ _type, timestamp, filteredContent, ...rest }) => {
        let finalContent = rest.content;
        if (_type && _type !== 'dynamic' && typeof finalContent === 'string') {
          finalContent = finalContent.replace(/\{{1,2}随机数\}{1,2}/g, () => Math.floor(Math.random() * 100) + 1);
        }
        return { ...rest, content: finalContent };
      });
    }
    exportSession() {
      let lockedContents = JSON.parse(JSON.stringify(this.lockedContents));
      let dynamicContent = JSON.parse(JSON.stringify(this.dynamicContent));
      let fullHistory = JSON.parse(JSON.stringify(this.fullHistory));
      let personalConfig = JSON.parse(JSON.stringify(this.personalConfig)); 
      return { 
          lockedContents, 
          dynamicContent, 
          fullHistory, 
          personalConfig, 
          ragContext: this.ragContext, 
          webSearchContext: this.webSearchContext, 
          timestamp: Date.now() 
      };
    }
    importSession(data) {
      this.lockedContents = {
        module: data.lockedContents?.module || null,
        roleCards: data.lockedContents?.roleCards || {},
        order: data.lockedContents?.order || [],
      };
      this.dynamicContent = data.fullHistory.filter((m) => m._type === "dynamic");
      this.fullHistory = [
        ...this.anchor.coreMessages,
        ...data.fullHistory.filter((m) => m._type?.startsWith("locked_") || m._type === "dynamic"),
      ];
      if (data.personalConfig) {
        this.personalConfig = { ...this.personalConfig, ...data.personalConfig };
      }
      this.ragContext = data.ragContext || null;
      this.webSearchContext = data.webSearchContext || null;
    }
    
    lockGeneration(controller) {
      this.isGenerating = true;
      this.abortController = controller;
    }

    unlockGeneration() {
      this.isGenerating = false;
      this.abortController = null;
    }
  }

  function createAbortController() {
      if (typeof AbortController !== "undefined") {
          return new AbortController();
      }
      return { signal: { aborted: false }, abort: function() { this.signal.aborted = true; } };
  }

  const sessions = new Map();
  const dynamicConfig = new DynamicConfig(ext);

  class SessionManager {
    constructor(ext) {
      this.ext = ext;
      this.storageKey = "openai_plugin_sessions"; 
      this.autoSavePrefix = "openai_autosave_";   
    }
    saveAutoSave(sessionKey, session) {
      this.ext.storageSet(this.autoSavePrefix + sessionKey, JSON.stringify(session.exportSession()));
    }
    loadAutoSave(sessionKey) {
      const data = this.ext.storageGet(this.autoSavePrefix + sessionKey);
      return data ? JSON.parse(data) : null;
    }
    saveSession(userId, sessionName, session) {
      let allSessions = JSON.parse(this.ext.storageGet(this.storageKey) || "{}");
      if (!allSessions[userId]) allSessions[userId] = {};
      allSessions[userId][sessionName] = session.exportSession();
      this.ext.storageSet(this.storageKey, JSON.stringify(allSessions));
    }
    loadSession(userId, sessionName) {
      const allSessions = JSON.parse(this.ext.storageGet(this.storageKey) || "{}");
      return allSessions[userId]?.[sessionName] || null;
    }
    listSessions(userId) {
      const allSessions = JSON.parse(this.ext.storageGet(this.storageKey) || "{}");
      return Object.keys(allSessions[userId] || {});
    }
    deleteSession(userId, sessionName) {
      let allSessions = JSON.parse(this.ext.storageGet(this.storageKey) || "{}");
      if (allSessions[userId]?.[sessionName]) {
        delete allSessions[userId][sessionName];
        this.ext.storageSet(this.storageKey, JSON.stringify(allSessions));
        return true;
      }
      return false;
    }
  }

  const sessionManager = new SessionManager(ext);
  let tempSessionRegistry = JSON.parse(ext.storageGet("openai_autosave_registry") || "{}");

  function recordSessionActivity(sessionKey) {
    tempSessionRegistry[sessionKey] = Date.now();
    ext.storageSet("openai_autosave_registry", JSON.stringify(tempSessionRegistry));
    const maxCount = dynamicConfig.maxTempSessions;
    if (maxCount > 0) {
      let keys = Object.keys(tempSessionRegistry);
      if (keys.length > maxCount) {
        keys.sort((a, b) => tempSessionRegistry[b] - tempSessionRegistry[a]);
        let toRemove = keys.slice(maxCount);
        for (let key of toRemove) {
          sessions.delete(key); 
          delete tempSessionRegistry[key]; 
          ext.storageSet(sessionManager.autoSavePrefix + key, ""); 
        }
        ext.storageSet("openai_autosave_registry", JSON.stringify(tempSessionRegistry));
      }
    }
  }

  function getSession(sessionKey) {
    let session = sessions.get(sessionKey);
    if (!session) {
      const autoSavedData = sessionManager.loadAutoSave(sessionKey);
      session = new ChatGPTSession(dynamicConfig);
      if (autoSavedData) {
        session.importSession(autoSavedData);
        session.anchor.refresh(dynamicConfig);
      }
      sessions.set(sessionKey, session);
    }
    recordSessionActivity(sessionKey);
    return session;
  }

  function updateSession(sessionKey, session) {
    sessions.set(sessionKey, session);
    sessionManager.saveAutoSave(sessionKey, session);
    recordSessionActivity(sessionKey);
  }

function filterContent(originalContent) {
    if (typeof originalContent !== 'string') {
        return { filteredContent: originalContent, thinkingContent: [], codeBlocks: [], pureText: originalContent };
    }
    
    let thinkingContent = [];
    let codeBlocks = [];
    
    let filteredContent = originalContent
      .replace(/<([a-zA-Z][a-zA-Z0-9_-]*)>([\s\S]*?)<\/\1>/g, (match, tag, inner) => {
        thinkingContent.push(inner.trim());
        return "";
      })
      .trim();
      
    let pureText = filteredContent;
    pureText = pureText.replace(/\[IMG:data:image\/[^;]+;base64,[^\]]+\]/g, "");
    pureText = pureText.replace(/!\[.*?\]\(data:image\/[^;]+;base64,[^\)]+\)/g, "");
    pureText = pureText.replace(/\[CQ:image,file=base64:\/\/[^\]]+\]/g, "");
    pureText = pureText.replace(/data:image\/[^;]+;base64,[^\s"'\)\]]+/g, "");
      
    return { filteredContent, thinkingContent, codeBlocks, pureText };
}

  function isSupportedImageFormat(urlOrBase64) {
      let checkStr = urlOrBase64;
      if (checkStr.length > 500) checkStr = checkStr.substring(0, 500); 
      const lowerStr = checkStr.toLowerCase();
      
      // 白名单检验：Base64 Mime
      if (lowerStr.startsWith('data:')) {
          const match = lowerStr.match(/^data:([^;]+);/);
          if (match) {
              const mime = match[1];
              const supportedMimes = [
                  'image/heif', 'video/mpg', 'audio/mpeg', 'image/png', 'image/jpg', 
                  'image/heic', 'video/mov', 'video/mp4', 'video/avi', 'video/wmv', 
                  'image/jpeg', 'text/plain', 'video/mpeg', 'video/mpegps', 'video/flv', 
                  'application/pdf', 'audio/mp3', 'image/webp', 'audio/wav'
              ];
              return supportedMimes.includes(mime);
          }
          return false;
      }

      // 白名单检验：URL 扩展名
      const extMatch = lowerStr.match(/\.([a-z0-9]+)(?:[\?#]|$)/);
      if (extMatch) {
          const ext = extMatch[1];
          const supportedExts = [
              'heif', 'heic', 'png', 'jpg', 'jpeg', 'webp', 
              'mp4', 'mpeg', 'mpg', 'mov', 'avi', 'wmv', 'flv', 
              'pdf', 'mp3', 'wav', 'txt'
          ];
          if (!supportedExts.includes(ext)) {
              return false;
          }
      } else {
          return false;
      }

      return true;
  }

  async function buildVisionMessages(messages, session, dynConfig) {
      const pConfig = session?.personalConfig || {};
      const enableImage = (pConfig.enableImage !== null && pConfig.enableImage !== undefined) ? pConfig.enableImage : dynConfig.enableImage;
      const debugMode = (pConfig.debugMode !== null && pConfig.debugMode !== undefined) ? pConfig.debugMode : dynConfig.debugMode;

      const finalMessages = [];
      for (const m of messages) {
          if (typeof m.content === 'string') {
              if (enableImage && m.content.includes('[IMG:') && m.role === 'user') {
                  const parts = m.content.split(/(\[IMG:[^\]]+\])/);
                  const contentArray = [];
                  for (const part of parts) {
                      if (part.startsWith('[IMG:')) {
                          let imgContent = part.slice(5, -1).trim();
                          
                          if (imgContent.startsWith('data:image')) {
                              if (!isSupportedImageFormat(imgContent)) {
                                  if (debugMode) console.log(`✧ 已拦截不支持的图片格式（Base64类型），直接过滤`);
                                  continue;
                              } else {
                                  contentArray.push({ type: "image_url", image_url: { url: imgContent } });
                              }
                          } else {
                              let url = imgContent;
                              if (url.startsWith('//')) url = 'http:' + url;
                              else if (!url.startsWith('http')) url = 'http://' + url;
                              
                              if (!isSupportedImageFormat(url)) {
                                  if (debugMode) console.log(`✧ 已拦截不支持的图片格式（直链: ${url}），直接过滤`);
                                  continue;
                              }

                              const b64 = await fetchImageToBase64(url);
                              if (b64) {
                                  if (!isSupportedImageFormat(b64)) {
                                      if (debugMode) console.log(`✧ 转码后格式仍不支持，直接过滤`);
                                      continue;
                                  } else {
                                      contentArray.push({ type: "image_url", image_url: { url: b64 } });
                                  }
                              } else {
                                  if (debugMode) console.log(`✧ 图片转码不成功，回退直链: ${url}`);
                                  contentArray.push({ type: "image_url", image_url: { url: url } });
                              }
                          }
                      } else if (part !== "") {
                          contentArray.push({ type: "text", text: part });
                      }
                  }
                  finalMessages.push({ ...m, content: contentArray.length > 0 ? contentArray : m.content });
              }
              else if (m.content.includes('[IMG:')) {
                  let strippedContent = m.content.replace(/\[IMG:[^\]]+\]/g, "");
                  finalMessages.push({ ...m, content: strippedContent });
              } else {
                  finalMessages.push(m);
              }
          } else if (Array.isArray(m.content)) {
              const safeContentArray = [];
              for (let item of m.content) {
                  if (item.type === "image_url" && item.image_url && item.image_url.url) {
                      if (isSupportedImageFormat(item.image_url.url)) {
                          safeContentArray.push(item);
                      } else {
                          if (debugMode) console.log(`✧ 拦截到多模态Array中的非法图片，直接过滤: ${item.image_url.url}`);
                          continue;
                      }
                  } else {
                      safeContentArray.push(item);
                  }
              }
              finalMessages.push({ ...m, content: safeContentArray });
          } else {
              finalMessages.push(m);
          }
      }
      return finalMessages;
  }

  // === 独立工具函数：Markdown图片相关性过滤引擎 ===
  function filterAndScoreImages(markdown) {
      const firstLineMatch = markdown.match(/^#*\s*(.*)/);
      const mainTitle = firstLineMatch ? firstLineMatch[1] : "";
      const keywords = mainTitle.toLowerCase().split(/[\s,，:：|]+/).filter(w => w.length > 1);

      const imgRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
      let match;
      const stringsToRemove = [];
      const validImages = [];

      while ((match = imgRegex.exec(markdown)) !== null) {
          const originalText = match[0];
          const altText = match[1].toLowerCase();
          const url = match[2].toLowerCase();
          const matchIndex = match.index;
          let score = 0;

          // 1. 致命缺陷：直接归零并彻底过滤
          if (
              url.includes('icon') || url.includes('logo') || url.includes('avatar') || 
              url.endsWith('.svg') || url.includes('banner') || url.includes('thumb') ||
              url.includes('footer') || url.includes('sidebar') || url.includes('ad') || 
              url.includes('sponsor') || url.startsWith('data:')
          ) {
              stringsToRemove.push(originalText);
              continue;
          }

          // 2. 结构与位置评分
          const positionRatio = matchIndex / markdown.length;
          if (positionRatio < 0.1) score += 30;
          else if (positionRatio < 0.3) score += 15;

          const contextBefore = markdown.substring(Math.max(0, matchIndex - 50), matchIndex);
          if (/\n#{1,4}\s/.test(contextBefore)) score += 25;

          // 3. 语义匹配评分
          const contextAround = markdown.substring(
              Math.max(0, matchIndex - 150), 
              Math.min(markdown.length, matchIndex + originalText.length + 150)
          ).toLowerCase();

          for (const kw of keywords) {
              if (altText.includes(kw)) score += 20;
              else if (url.includes(kw)) score += 15;
              else if (contextAround.includes(kw)) score += 5;
          }

          // 4. 判定线（满分通常在75+，及格线设为30）
          if (score >= 30) {
              validImages.push({ url: match[2], alt: altText, score }); 
          } else {
              stringsToRemove.push(originalText);
          }
      }

      // 纯净化：不留占位符直接抹除
      let cleanedMarkdown = markdown;
      for (const str of stringsToRemove) {
          cleanedMarkdown = cleanedMarkdown.replace(str, ''); 
      }
      // 去除HTML的 <img> 标签污染正则
      cleanedMarkdown = cleanedMarkdown.replace(/<img[^>]+>/ig, ""); 

      return {
          topImages: validImages.sort((a, b) => b.score - a.score),
          cleanedMarkdown: cleanedMarkdown
      };
  }

async function syncModule(session, dynConfig) {
    const pConfig = session?.personalConfig || {};
    const moduleData = (pConfig.moduleData !== null && pConfig.moduleData !== undefined && pConfig.moduleData !== "")
        ? pConfig.moduleData
        : dynConfig.moduleData;

    if (!moduleData || moduleData.trim() === "") {
        if (session.lockedContents.module) {
            session.clearLockedContent("module");
        }
        return;
    }
    const newContent = `<module_data>\n${moduleData}\n</module_data>`;
    const currentLocked = session.lockedContents.module ? session.lockedContents.module.content : null;
    if (currentLocked !== newContent) {
        session.lockModule(newContent);
    }
}

  async function executeContextTasks(session, processedText, userId, sessionKey, dynConfig, ctx, msg) {
      session.webSearchContext = null; 

      let pureTextUrls = [];
      const rawUrlRegex = /https?:\/\/[^\s\u4e00-\u9fa5\]\>\"\'\)]+/ig;
      let urlMatch;
      while ((urlMatch = rawUrlRegex.exec(processedText)) !== null) {
          let url = urlMatch[0].replace(/[.,;!?。，；！？]+$/, '');
          const prefix = processedText.substring(Math.max(0, urlMatch.index - 5), urlMatch.index);
          if (!prefix.includes("[IMG:") && !url.match(/\.(png|jpg|jpeg|gif|webp|mp4|mp3|wav)$/i)) {
              pureTextUrls.push(url);
          }
      }

      if (session.dynamicContent.length === 0) {
          const syncApiUrlForClear = session.personalConfig.kbSyncApi || dynConfig.kbSyncApi;
          if (syncApiUrlForClear) {
              try {
                  const clearUrl = syncApiUrlForClear.replace(/\/sync\/?$/, '/clear');
                  seal.replyToSender(ctx, msg, "✧ 检测到当前无会话轮数，正在清扫云端知识库 ..."); 
                  
                  // 30 秒超时阻塞
                  await safeFetchWithTimeout(clearUrl, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ sessionId: sessionKey })
                  }, 30000);
                  
                  seal.replyToSender(ctx, msg, "✧ 云端知识库已清扫完毕"); 
              } catch (e) {
                  seal.replyToSender(ctx, msg, "✧ 云端知识库清扫超时或失败 已跳过并执行当前对话");
                  if (dynConfig.debugMode) console.log("✧ 知识库自动清空异常", e);
              }
          }
      }

      session.ragContext = null; 

      const enableKBQuery = (session.personalConfig.enableKBQuery !== null && session.personalConfig.enableKBQuery !== undefined) ? session.personalConfig.enableKBQuery : dynConfig.enableKBQuery;
      const kbQueryApi = session.personalConfig.kbQueryApi || dynConfig.kbQueryApi;
      
      let ragTask = Promise.resolve();
      if (enableKBQuery && kbQueryApi) {
          ragTask = (async () => {
              try {
                  await new Promise(resolve => setTimeout(resolve, 500));
                  
                  const compressPrompt = dynConfig.semanticPrefix + "\n" + processedText;
                  const compressedText = await sendPublicAPIRequest(session, [{role: "user", content: compressPrompt}], dynConfig);
                  
                  if (compressedText) {
                      if (dynConfig.debugMode) console.log("✧ 知识库检索 提取到的压缩语义 ", compressedText);
                      const kbRes = await fetch(kbQueryApi, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ query: compressedText, userId: userId, sessionId: sessionKey })
                      });
                      
                      if (kbRes.ok) {
                          const contentType = kbRes.headers.get("content-type");
                          let ragText = contentType && contentType.includes("application/json") ? ((await kbRes.json()).text || "") : (await kbRes.text());
                          if (ragText && ragText.trim() !== "") {
                              session.ragContext = `<module_data>\n${ragText}\n</module_data>`;
                          }
                      }
                  }
              } catch (e) {
                  console.error("✧ 知识库检索流程异常 ", e);
              }
          })();
      }

      let networkTask = Promise.resolve([]);
      const isNetworkEnabled = (session.personalConfig.enableNetwork !== null && session.personalConfig.enableNetwork !== undefined) ? session.personalConfig.enableNetwork : dynConfig.enableNetwork;
      
      if (isNetworkEnabled) {
          seal.replyToSender(ctx, msg, "✧ 正在思考并检索 ...");
          networkTask = getNetworkLinksFromPublicAPI(session, processedText, dynConfig);
      }

      const [_, apiUrls] = await Promise.all([ragTask, networkTask]);

      const allUrls = [...new Set([...pureTextUrls, ...apiUrls])]; 
      
      if (allUrls.length > 0) {
          seal.replyToSender(ctx, msg, `✧ 正在抓取 ${allUrls.length} 个网页内容 ...`);
          let pageContents = "[实时网络检索结果]: 参考网页内容";
          let hasNewContent = false;
          let webImages = []; 

          const scrapeResults = [];
          for (const url of allUrls) {
              let content = await fetchWebpageContent(url, dynConfig.webpageMaxLength);
              if (content && !content.includes("抓取网页失败") && !content.includes("执行异常")) {
                  scrapeResults.push(`\n\n--- ${url} ---\n${content}`);
              } else {
                  scrapeResults.push(null);
              }
              await new Promise(r => setTimeout(r, 600)); 
          }

          // === 注入评分与净化逻辑 ===
          scrapeResults.forEach(res => {
              if (res) {
                  hasNewContent = true;
                  const { topImages, cleanedMarkdown } = filterAndScoreImages(res);
                  
                  // 将高分的高质量图片提取用于 Vision 挂载
                  topImages.forEach(img => webImages.push(img.url));
                  
                  // 存入 pageContents 的是已经被严格净化、没有垃圾占位符的文本
                  pageContents += `\n${cleanedMarkdown}\n`; 
              }
          });

          if (hasNewContent) {
              let uniqueWebImages = [...new Set(webImages)].filter(url => url.startsWith('http')).slice(0, 10);
              
              const pConfig = session?.personalConfig || {};
              const enableImage = (pConfig.enableImage !== null && pConfig.enableImage !== undefined) ? pConfig.enableImage : dynConfig.enableImage;

              if (enableImage && uniqueWebImages.length > 0) {
                  let contentArray = [
                      { type: "text", text: `<web_search>\n${pageContents}\n</web_search>` }
                  ];
                  uniqueWebImages.forEach(url => {
                      contentArray.push({ type: "image_url", image_url: { url: url } });
                  });
                  session.webSearchContext = contentArray;
                  if (dynConfig.debugMode) console.log(`✧ 图片挂载 已追加 ${uniqueWebImages.length} 张原图直链`);
              } else {
                  session.webSearchContext = `<web_search>\n${pageContents}\n</web_search>`;
              }
          }
      }
  }

    async function syncToKnowledgeBase(session, dynConfig, sessionKey) {
      const pConfig = session.personalConfig || {};
      const enableSync = (pConfig.enableKBSync !== null && pConfig.enableKBSync !== undefined) ? pConfig.enableKBSync : dynConfig.enableKBSync;
      const syncApiUrl = pConfig.kbSyncApi || dynConfig.kbSyncApi;

      if (!enableSync || !syncApiUrl) return;

      const pushModule = (pConfig.pushModuleToKB !== null && pConfig.pushModuleToKB !== undefined) ? pConfig.pushModuleToKB : dynConfig.pushModuleToKB;

      try {
          let moduleContent = null;
          if (pushModule && session.lockedContents.module) {
              moduleContent = session.lockedContents.module.content;
          }

          // === 已删除 anchorsObj 的组装逻辑 ===

          let pureHistory = session.dynamicContent.map(msg => {
              let { pureText } = filterContent(msg.content);
              if (typeof pureText === 'string') {
                  pureText = pureText.replace(/^\(QQ:\d+\)\s*/i, "");
                  pureText = pureText.replace(/^\(.*?\)\s*/, ""); 
              }
              return { role: msg.role, content: pureText };
          });

          const syncPayload = {
              sessionId: sessionKey, 
              timestamp: Date.now(),
              moduleData: moduleContent,
              // === 已从 Payload 中移除 anchors 字段 ===
              history: pureHistory
          };

          fetch(syncApiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(syncPayload)
          }).catch(err => {
              if (dynConfig.debugMode) console.log("✧ 知识库同步静默异常", err);
          });
      } catch (e) {
          if (dynConfig.debugMode) console.error("✧ 知识库组装同步数据异常", e);
      }
  }

  async function sendPublicAPIRequest(session, messages, dynConfig) {
      const apiUrl = dynConfig.publicApiUrl;
      const apiKey = dynConfig.publicApiKey;
      const modelsRaw = dynConfig.publicModelName;

      if (!apiUrl || !apiKey || !modelsRaw) {
          if (dynConfig.debugMode) console.log("✧ API异常 环境未配置完全");
          return null;
      }

      const models = modelsRaw.split(/[\s]+|\\n|\\r/).filter(m => m.trim() !== "");
      let finalError = null;

      const finalMessages = await buildVisionMessages(messages, session, dynConfig);

      for (let mIdx = 0; mIdx < models.length; mIdx++) {
          const currentModel = models[mIdx];
          const payload = {
              model: currentModel,
              messages: finalMessages,
              temperature: dynConfig.temperature,
              max_tokens: dynConfig.maxTokens
          };
          try {
              const response = await fetch(apiUrl, {
                  method: "POST",
                  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
                  body: JSON.stringify(payload)
              });
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              const data = await response.json();
              return data.choices[0].message.content || "";
          } catch (err) {
              finalError = err;
              if (dynConfig.debugMode) console.error(`✧ API异常 模型 ${currentModel} 请求失败:`, err);
          }
      }
      return null;
  }

  async function getNetworkLinksFromPublicAPI(session, userText, dynConfig) {
      const apiUrl = dynConfig.publicApiUrl;
      const apiKey = dynConfig.publicApiKey;
      const modelNameRaw = dynConfig.publicModelName;

      if (!apiUrl || !apiKey || !modelNameRaw) {
          if (dynConfig.debugMode) console.log("✧ API异常 环境未配置完全，放弃联网。");
          return [];
      }

      const models = modelNameRaw.split(/[\s]+|\\n|\\r/).filter(m => m.trim() !== "");
      let finalOutput = "";

      const recentHistoryMsgs = session.dynamicContent.slice(-4).map(msg => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content 
      }));

      const messagesContextRaw = [
          ...recentHistoryMsgs,
          { role: "user", content: dynConfig.networkPrefix + "\n" + userText }
      ];

      const messagesContext = await buildVisionMessages(messagesContextRaw, session, dynConfig);

      for (let mIdx = 0; mIdx < models.length; mIdx++) {
          const currentModel = models[mIdx];
          const payload = {
              model: currentModel,
              temperature: 0.3,
              messages: messagesContext,
              tools: [{
                  type: "function",
                  function: {
                      name: "web_search",
                      description: "使用搜索引擎查询实时信息、新闻、不知道的信息。当用户询问最新事实、当前事件、不明确的信息时使用此工具，必须传入query搜索词。",
                      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
                  }
              }],
              tool_choice: "auto"
          };

          let iteration = 0;
          const MAX_ITERS = dynConfig.maxNetworkIterations;
          let success = false;

          while (iteration < MAX_ITERS) {
              iteration++;
              if (iteration === MAX_ITERS) { delete payload.tools; delete payload.tool_choice; }

              try {
                  const response = await fetch(apiUrl, {
                      method: "POST",
                      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
                      body: JSON.stringify({...payload, messages: messagesContext}) 
                  });
                  if (!response.ok) throw new Error(`HTTP ${response.status}`);
                  const data = await response.json();
                  const msgObj = data.choices[0].message;

                  if (msgObj.tool_calls && msgObj.tool_calls.length > 0) {
                      messagesContext.push(msgObj);
                      for (let tc of msgObj.tool_calls) {
                          if (["web_search", "google_search"].includes(tc.function.name)) {
                              let args = {}; try { args = JSON.parse(tc.function.arguments); } catch(e) {}
                              if (dynConfig.debugMode) console.log(`✧ 联网思考 工具请求: ${args.query}`);
                              let searchRes = await performSerperSearch(args.query || "");
                              messagesContext.push({ role: "tool", tool_call_id: tc.id, content: searchRes });
                          } else {
                              messagesContext.push({ role: "tool", tool_call_id: tc.id, content: "✧ 系统错误 无需调用此工具" });
                          }
                      }
                  } else {
                      finalOutput = msgObj.content || "";
                      success = true;
                      break;
                  }
              } catch (e) {
                  if (dynConfig.debugMode) console.error(`✧ API联网搜链异常 模型 ${currentModel}:`, e);
                  break;
              }
          }
          if (success) break;
      }

      let extractedUrls = [];
      const rawUrlRegex = /https?:\/\/[^\s\u4e00-\u9fa5\]\>\"\'\)]+/ig;
      let m;
      while ((m = rawUrlRegex.exec(finalOutput)) !== null) {
          let url = m[0].replace(/[.,;!?。，；！？]+$/, '');
          if (!url.match(/\.(png|jpg|jpeg|gif|webp|mp4|mp3|wav)$/i)) {
              extractedUrls.push(url);
          }
      }
      if (dynConfig.debugMode) console.log("✧ 提取的纯净链接列表: ", extractedUrls);
      return extractedUrls;
  }

  async function updateStatusBar(session, aiReply, dynConfig) {
    const enableKBQuery = (session.personalConfig.enableKBQuery !== null && session.personalConfig.enableKBQuery !== undefined) ? session.personalConfig.enableKBQuery : dynConfig.enableKBQuery;
    
    if (!enableKBQuery) return;
    
    try {
        let currentAnchor0 = (session.personalConfig.fixedAnchors && session.personalConfig.fixedAnchors[0] !== undefined) 
                              ? session.personalConfig.fixedAnchors[0] 
                              : (dynConfig.fixedAnchors[0] || "");

        // --- 新增流程：加载当前轮次的角色卡并拼接 ---
        let roleCardsContent = "";
        if (session.lockedContents && session.lockedContents.roleCards) {
            for (const cardId in session.lockedContents.roleCards) {
                const cardData = session.lockedContents.roleCards[cardId];
                if (cardData && cardData.content) {
                    // 使用标题为"角色卡+数字"的代码块包裹
                    roleCardsContent += `\`\`\`角色卡${cardId}\n${cardData.content}\n\`\`\`\n`;
                }
            }
        }
        
        let combinedAnchor0 = currentAnchor0;
        if (roleCardsContent.trim() !== "") {
            // 锚定项0前后拼接合并进锚定项0的文本一次
            combinedAnchor0 = `${currentAnchor0}\n\n${roleCardsContent.trim()}`;
        }

        let latestUserInput = "";
        const dynamic = session.dynamicContent;
        for (let i = dynamic.length - 1; i >= 0; i--) {
            if (dynamic[i].role === "user") {
                const { pureText } = filterContent(dynamic[i].content);
                latestUserInput = pureText;
                break;
            }
        }

        // 发送给处理状态栏的流程时，传入拼接合并后的 combinedAnchor0
        const statusBarPrompt = dynConfig.statusBarPrefix + "\n\nuser: \n" + latestUserInput + "\n\nassistant: \n" + aiReply + "\n\n当前状态: \n" + combinedAnchor0;
        const newStatusBarRes = await sendPublicAPIRequest(session, [{role: "user", content: statusBarPrompt}], dynConfig);
        
        if (newStatusBarRes) {
            const codeBlockMatch = newStatusBarRes.match(/```[\s\S]*?```/);
            if (codeBlockMatch) {
                if (!session.personalConfig.fixedAnchors) session.personalConfig.fixedAnchors = {};
                session.personalConfig.fixedAnchors[0] = codeBlockMatch[0];
                
                for (let i = session.dynamicContent.length - 1; i >= 0; i--) {
                    if (session.dynamicContent[i].role === "assistant") {
                        session.dynamicContent[i].anchorSnapshot = codeBlockMatch[0];
                        break;
                    }
                }
                
                if (dynConfig.debugMode) console.log("✧ 状态栏更新 成功正则提取并更新个人配置项：锚定项0");
            } else {
                if (dynConfig.debugMode) console.log("✧ 状态栏更新 未检测到代码块 跳过更新");
            }
        }
    } catch (e) {
        console.error("✧ 状态栏提取异常", e);
    }
}

  // === 状态栏回滚函数 ===
  function rollbackStatusBar(session, dynConfig) {
      let lastValidAnchor = dynConfig.fixedAnchors[0] || ""; 
      
      for (let i = session.dynamicContent.length - 1; i >= 0; i--) {
          if (session.dynamicContent[i].role === "assistant" && session.dynamicContent[i].anchorSnapshot) {
              lastValidAnchor = session.dynamicContent[i].anchorSnapshot;
              break;
          }
      }
      
      if (!session.personalConfig.fixedAnchors) {
          session.personalConfig.fixedAnchors = {};
      }
      session.personalConfig.fixedAnchors[0] = lastValidAnchor;
  }

  async function fetchImageToBase64(url) {
    const transApiBaseUrl = dynamicConfig.imgTransApi;
    if (!transApiBaseUrl || transApiBaseUrl.trim() === "") {
        return null; 
    }
    return new Promise(async (resolve) => {
      try {
        const targetUrl = transApiBaseUrl.includes('?') 
          ? `${transApiBaseUrl}&url=${encodeURIComponent(url)}` 
          : `${transApiBaseUrl}?url=${encodeURIComponent(url)}`;
        
        const response = await fetch(targetUrl);
        if (!response.ok) return resolve(null);
        const textData = await response.text();
        let b64Data = textData.trim();
        if (b64Data && !b64Data.startsWith('data:image')) {
           b64Data = `data:image/jpeg;base64,${b64Data}`;
        }
        resolve(b64Data);
      } catch (e) {
        resolve(null);
      }
    });
  }

  async function performSerperSearch(query) {
    const apiKey = dynamicConfig.serperApiKey;
    if (!apiKey) {
        console.error("✧ 联网搜索 缺少 Serper搜索API密钥 配置");
        return "✧ 未配置搜索API密钥，无法进行搜索";
    }
    try {
        const response = await safeFetchWithTimeout("https" + "://google.serper.dev/search", {
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ q: query })
        }, 30000);
        
        if (!response.ok) return "搜索API请求失败，状态码: " + response.status;
        const data = await response.json();
        if (data.organic && data.organic.length > 0) {
            return data.organic.slice(0, 5).map(item => `标题: ${item.title}\n摘要: ${item.snippet}\n链接: ${item.link}`).join("\n\n");
        }
        return "未找到相关搜索结果。";
    } catch (error) {
        console.error("✧ 联网搜索 异常:", error);
        return "搜索执行异常: " + error.message;
    }
  }

  async function fetchWebpageContent(url, maxLength = 4000) {
    try {
        const response = await safeFetchWithTimeout("https" + "://r.jina.ai/" + url, {
            method: "GET",
            headers: { 
                "Accept": "text/plain",
                "X-Return-Format": "markdown" 
            }
        }, 30000);
        
        if (!response.ok) return "✧ 抓取网页失败，状态码: " + response.status;
        const text = await response.text();
        return text.length > maxLength ? text.substring(0, maxLength) + "\n...[内容过长已截断]" : text;
    } catch (error) {
        console.error("✧ 网页抓取异常 ", error);
        return "✧ 网页抓取执行异常 " + error.message;
    }
  }

  function renderText(originalText) {
    if (!originalText) return originalText;

    let rendered = originalText
      .replace(/\*\*([\s\S]*?)\*\*/g, '「$1」') // 将 **包裹的文本** 替换为 「包裹的文本」
      .replace(/---/g, '⊹═══') 
      .replace(/^(\s*)(#+)/gm, (match, space, hashes) => space + '✦'.repeat(hashes.length)) 
      .replace(/^(\s*)(?:-|\*)\s/gm, '$1⊹ ') // 像单个 - 一样的逻辑，将单 * 也作为列表符替换为 ⊹
      .replace(/[【】]/g, '◈'); // 将 【 和 】 替换为 ◈

    const numMap = ['𝟶', '𝟷', '𝟸', '𝟹', '𝟺', '𝟻', '𝟼', '𝟽', '𝟾', '𝟿'];
    const upperMap = ['𝙰', '𝙱', '𝙲', '𝙳', '𝙴', '𝙵', '𝙶', '𝙷', '𝙸', '𝙹', '𝙺', '𝙻', '𝙼', '𝙽', '𝙾', '𝙿', '𝚀', '𝚁', '𝚂', '𝚃', '𝚄', '𝚅', '𝚆', '𝚇', '𝚈', '𝚉'];
    const lowerMap = ['𝚊', '𝚋', '𝚌', '𝚍', '𝚎', '𝚏', '𝚐', '𝚑', '𝚒', '𝚓', '𝚔', '𝚕', '𝚖', '𝚗', '𝚘', '𝚙', '𝚚', '𝚛', '𝚜', '𝚝', '𝚞', '𝚟', '𝚠', '𝚡', '𝚢', '𝚣'];

    rendered = rendered.replace(/\\f|\\n|[0-9a-zA-Z]/g, match => {
      if (match === '\\f' || match === '\\n') return match;
      const char = match;
      const code = char.charCodeAt(0);
      if (code >= 48 && code <= 57) return numMap[code - 48];
      if (code >= 65 && code <= 90) return upperMap[code - 65];
      if (code >= 97 && code <= 122) return lowerMap[code - 97];
      return char;
    });

    const kanaMap = {
      'ア':'ｱ', 'イ':'ｲ', 'ウ':'ｳ', 'エ':'ｴ', 'オ':'ｵ', 'カ':'ｶ', 'キ':'ｷ', 'ク':'ｸ', 'ケ':'ｹ', 'コ':'ｺ',
      'サ':'ｻ', 'シ':'ｼ', 'ス':'ｽ', 'セ':'ｾ', 'ソ':'ｿ', 'タ':'ﾀ', 'チ':'ﾁ', 'ツ':'ﾂ', 'テ':'ﾃ', 'ト':'ﾄ',
      'ナ':'ﾅ', 'ニ':'ﾆ', 'ヌ':'ﾇ', 'ネ':'ﾈ', 'ノ':'ﾉ', 'ハ':'ﾊ', 'ヒ':'ﾋ', 'フ':'ﾌ', 'ヘ':'ﾍ', 'ホ':'ﾎ',
      'マ':'ﾏ', 'ミ':'ﾐ', 'ム':'ﾑ', 'メ':'ﾒ', 'モ':'ﾓ', 'ヤ':'ﾔ', 'ユ':'ﾕ', 'ヨ':'ﾖ', 'ラ':'ﾗ', 'リ':'ﾘ', 
      'ル':'ﾙ', 'レ':'ﾚ', 'ロ':'ﾛ', 'ワ':'ﾜ', 'ヲ':'ｦ', 'ン':'ﾝ', 'ァ':'ｧ', 'ィ':'ｨ', 'ゥ':'ｩ', 'ェ':'ｪ', 
      'ォ':'ｫ', 'ッ':'ｯ', 'ャ':'ｬ', 'ュ':'ｭ', 'ョ':'ｮ', 'ヴ':'ｳﾞ', 'ガ':'ｶﾞ', 'ギ':'ｷﾞ', 'グ':'ｸﾞ', 'ゲ':'ｹﾞ', 
      'ゴ':'ｺﾞ', 'ザ':'ｻﾞ', 'ジ':'ｼﾞ', 'ズ':'ｽﾞ', 'ゼ':'ｾﾞ', 'ゾ':'ｿﾞ', 'ダ':'ﾀﾞ', 'ヂ':'ﾁﾞ', 'ヅ':'ﾂﾞ', 
      'デ':'ﾃﾞ', 'ド':'ﾄﾞ', 'バ':'ﾊﾞ', 'ビ':'ﾋﾞ', 'ブ':'ﾌﾞ', 'ベ':'ﾍﾞ', 'ボ':'ﾎﾞ', 'パ':'ﾊﾟ', 'ピ':'ﾋﾟ', 
      'プ':'ﾌﾟ', 'ペ':'ﾍﾟ', 'ポ':'ﾎﾟ', 'ー':'ｰ'
    };
    rendered = rendered.replace(/[\u30A1-\u30F6\u30FC]/g, char => kanaMap[char] || char);
    return rendered;
  }

  async function exportSession(userId, sessionName, isFullExport, config, ctx) {
    let session;
    if (sessionName) {
      const savedData = sessionManager.loadSession(userId, sessionName);
      if (!savedData) return `✧ 会话「${sessionName}」不存在，请检查会话标题是否正确`;
      session = new ChatGPTSession(config);
      session.importSession(savedData);
    } else {
      const sessionKey = ctx.isPrivate ? `user_${userId}` : `group_${ctx.group?.groupId || "default"}`;
      session = getSession(sessionKey);
      const hasHistory = session && session.fullHistory && session.fullHistory.length > 0;
      if (!hasHistory) return "✧ 当前会话为空";
    }
    const dynamicMessages = session.fullHistory.filter((m) => (m.role === "user" || m.role === "assistant") && m._type === "dynamic");
    if (dynamicMessages.length === 0) return "✧ 会话记录中没有可导出的对话内容";
    const uniqueUsers = new Set();
    dynamicMessages.forEach(msg => { if (msg.role === "user") { 
        let contentStr = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        const match = contentStr.match(/^\((.*?)\)\s*/); 
        if (match) uniqueUsers.add(match[1]); 
    } });
    const isMultiUser = !ctx.isPrivate && uniqueUsers.size > 1;
    const messages = dynamicMessages.map((msg) => {
        let content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
        let roleLabel = msg.role === "user" ? "Investigator" : "Owen";
        if (msg.role === "user") {
          let currentUserId = "";
          const match = content.match(/^\((.*?)\)\s*(.*)$/s);
          if (match) { currentUserId = match[1]; content = match[2]; }
          if (isMultiUser && currentUserId) {
            let displayId = currentUserId;
            if (!/^([A-Za-z]+):/.test(displayId)) { displayId = `QQ:${displayId}`; }
            roleLabel = `Investigator (${displayId})`;
          }
          if (!isFullExport) {
            content = content.replaceAll(config.triggerWord, "")
                             .replace(/[\(（\[](?:[^\)）\]］]*?)[\)）\]］]/g, "")
                             .replace(/\s+/g, " ")
                             .trim();
          }
        } else {
          if (!isFullExport) { const { pureText } = filterContent(content); content = pureText; }
        }
        
        content = content.replace(/\\f|\f/g, "").replace(/\\n/g, "\n").trim();
        return `${roleLabel}: ${content}`;
    });
    try {
      const response = await fetch("https://dpaste.com/api/v2/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `content=${encodeURIComponent(messages.join("\n\n\n"))}&expiry_days=7`
      });
      if (!response.ok) throw new Error(`✧ 服务响应异常 ${response.status}`);
      const downloadUrl = (await response.text()).trim();
      const title = sessionName ? `「${sessionName}」` : "当前对话记录";
      return `✧ 导出${title}成功\n阅览地址：${downloadUrl}\n下载地址：${downloadUrl}.txt\n(链接有效期：7天)\n\n请在浏览器打开另存为下载`;
    } catch (error) { console.error("✧ 导出会话失败 ", error); return `✧导出失败  ${error.message}`; }
  }

  async function handleMessage(ctx, msg) {
    const userId = ctx.player.userId;
    const text = (msg.message || "").trim();
    const sessionKey = ctx.isPrivate ? `user_${userId}` : `group_${ctx.group?.groupId || "default"}`;
    dynamicConfig.refresh();
    if (dynamicConfig.blockWords && dynamicConfig.blockWords.length > 0) {
      if (dynamicConfig.blockWords.some(word => text.includes(word))) return;
    }

    const checkAPIConfig = (session, isTriggering = false) => {
        const p = session.personalConfig;
        if (!p.apiUrl || !p.apiKey || !p.modelName) {
            if (ctx.privilegeLevel >= 100) {
                p.apiUrl = p.apiUrl || dynamicConfig.apiUrl;
                p.apiKey = p.apiKey || dynamicConfig.apiKey;
                p.modelName = p.modelName || dynamicConfig.modelName;
                updateSession(sessionKey, session);
                return true;
            } else {
                if (dynamicConfig.publicApiUrl && dynamicConfig.publicApiKey && dynamicConfig.publicModelName) {
                    p.apiUrl = p.apiUrl || dynamicConfig.publicApiUrl;
                    p.apiKey = p.apiKey || dynamicConfig.publicApiKey;
                    p.modelName = p.modelName || dynamicConfig.publicModelName;
                    p.contextRounds = 10; 
                    updateSession(sessionKey, session);
                    
                    if (isTriggering) {
                        seal.replyToSender(ctx, msg, "✧ 未配置API 已为当前环境接入后台公用API，推荐发送『 AI手册 』查看个人配置方法");
                    }
                    return true;
                }
                return false;
            }
        }
        return true;
    };

    const processManagementCommands = () => {
      if (text.match(/^开启调试模式$/i)) {
        if (ctx.privilegeLevel < 100) {
            seal.replyToSender(ctx, msg, "✧ 权限不足");
            return true;
        }
        let session = getSession(sessionKey);
        session.personalConfig.debugMode = true;
        updateSession(sessionKey, session);
        seal.replyToSender(ctx, msg, `✧ 已开启调试模式`);
        return true;
      }
      if (text.match(/^关闭调试模式$/i)) {
        if (ctx.privilegeLevel < 100) {
            seal.replyToSender(ctx, msg, "✧ 权限不足");
            return true;
        }
        let session = getSession(sessionKey);
        session.personalConfig.debugMode = false;
        updateSession(sessionKey, session);
        seal.replyToSender(ctx, msg, `✧ 已关闭调试模式`);
        return true;
      }

      if (text.match(/^加载公开api$/i)) {
        let session = getSession(sessionKey);
        if (!dynamicConfig.publicApiUrl || !dynamicConfig.publicApiKey || !dynamicConfig.publicModelName) {
          seal.replyToSender(ctx, msg, "✧ 未配置 获取失败");
          return true;
        }
        session.personalConfig.apiUrl = dynamicConfig.publicApiUrl;
        session.personalConfig.apiKey = dynamicConfig.publicApiKey;
        session.personalConfig.modelName = dynamicConfig.publicModelName;
        updateSession(sessionKey, session);
        seal.replyToSender(ctx, msg, "✧ 已成功加载API配置");
        return true;
      }

      if (text.match(/^加载api$/i)) {
        if (ctx.privilegeLevel < 100) {
          seal.replyToSender(ctx, msg, "✧ 权限不足");
          return true;
        }
        let session = getSession(sessionKey);
        if (!dynamicConfig.apiUrl || !dynamicConfig.apiKey || !dynamicConfig.modelName) {
          seal.replyToSender(ctx, msg, "✧ 未配置 获取失败");
          return true;
        }
        session.personalConfig.apiUrl = dynamicConfig.apiUrl;
        session.personalConfig.apiKey = dynamicConfig.apiKey;
        session.personalConfig.modelName = dynamicConfig.modelName;
        updateSession(sessionKey, session);
        seal.replyToSender(ctx, msg, "✧ 已成功加载API配置");
        return true;
      }

      const showConfigMatch = text.match(/^显示配置$/i);
      if (showConfigMatch) {
        let session = getSession(sessionKey);
        let p = session.personalConfig;
        
        const formatVal = (val) => (val !== null && val !== undefined && val !== "") ? val : "未配置";
        const formatBool = (val) => (val !== null && val !== undefined) ? (val ? "开启" : "关闭") : "未配置";
        const formatMasked = (val) => (val !== null && val !== undefined && val !== "") ? "◈已配置◈" : "未配置";
        const formatFilterId = (val) => {
          if (val === null || val === undefined) return "未配置";
          return val ? "关闭识别码" : "开启识别码";
        };

        let msgStr = `当前环境个人配置状态：
系统提示: ${(p.systemPrompt ? "◈已客制◈" : "未配置")}
API端点: ${formatMasked(p.apiUrl)}
API密钥: ${formatMasked(p.apiKey)}
外部模组地址: ${formatVal(p.moduleBaseUrl)}
个人模组: ${(p.moduleData !== null && p.moduleData !== undefined && p.moduleData !== "") ? "◈已配置◈" : "未配置"}
模型名称: ${formatMasked(p.modelName)}
纯净模式: ${formatBool(p.pureModeEnabled)}
引用回复: ${formatBool(p.useReply)}
流式请求: ${formatBool(p.enableStream)}
识别图片: ${formatBool(p.enableImage)}
调试模式: ${formatBool(p.debugMode)}
联网请求: ${formatBool(p.enableNetwork)}
向知识库推送模组: ${formatBool(p.pushModuleToKB)}
知识库同步: ${formatBool(p.enableKBSync)}
知识库同步API: ${formatMasked(p.kbSyncApi)}
知识库检索: ${formatBool(p.enableKBQuery)}
知识库检索API: ${formatMasked(p.kbQueryApi)}
最大回复tokens数: ${formatVal(p.maxTokens)}
最大回复字符数: ${formatVal(p.maxChars)}
网页抓取最大字符数: ${formatVal(p.webpageMaxLength)}
联网最大迭代次数: ${formatVal(p.maxNetworkIterations)}
存储上下文轮数: ${formatVal(p.contextRounds)}
温度(Temp): ${formatVal(p.temperature)}
Top-p: ${formatVal(p.top_p)}
Top-k: ${formatVal(p.top_k)}
Presence Penalty: ${formatVal(p.presence_penalty)}
Frequency Penalty: ${formatVal(p.frequency_penalty)}
随机种子(Seed): ${formatVal(p.seed)}
深度: ${formatVal(p.depth)}
身份识别码: ${formatFilterId(p.filterIdEnabled)}`;

        seal.replyToSender(ctx, msg, msgStr);
        return true;
      }

      if (text.startsWith("保存会话")) {
        const sessionName = text.slice(4).trim();
        if (!sessionName) return seal.replyToSender(ctx, msg, "✧ 请输入会话名称");
        const session = getSession(sessionKey); 
        if (session.fullHistory.length === 0) return seal.replyToSender(ctx, msg, "没有可保存的会话");
        sessionManager.saveSession(userId, sessionName, session);
        seal.replyToSender(ctx, msg, `✧ 会话「${sessionName}」保存成功`);
        return true;
      }
      
      if (text.startsWith("加载会话")) {
        const sessionName = text.slice(4).trim();
        if (!sessionName) return seal.replyToSender(ctx, msg, "✧ 请输入会话名称");
        const savedData = sessionManager.loadSession(userId, sessionName);
        if (!savedData) return seal.replyToSender(ctx, msg, "✧ 会话不存在");
        
        const oldSession = getSession(sessionKey);
        const newSession = new ChatGPTSession(dynamicConfig);
        newSession.importSession(savedData);
        newSession.personalConfig = JSON.parse(JSON.stringify(oldSession.personalConfig));
        newSession.anchor.refresh(dynamicConfig);
        updateSession(sessionKey, newSession); 
        seal.replyToSender(ctx, msg, `✧ 会话「${sessionName}」加载成功 锁定状态覆盖`);
        return true;
      }
      
      if (text.match(/^会话(?:清单|列表)$/)) {
        const list = sessionManager.listSessions(userId);
        seal.replyToSender(ctx, msg, list.length ? `✧ 保存的会话 \n${list.join("\n")}` : "无");
        return true;
      }
      if (text.startsWith("删除会话")) {
        const sessionName = text.slice(4).trim();
        if (!sessionName) return seal.replyToSender(ctx, msg, "✧ 请输入会话名称");
        if (sessionManager.deleteSession(userId, sessionName)) { seal.replyToSender(ctx, msg, `✧ 会话「${sessionName}」已删除`); }
        else { seal.replyToSender(ctx, msg, "✧ 会话不存在"); }
        return true;
      }
      
      const toggleCommands = [
        { on: "开启纯净模式", off: "关闭纯净模式", key: "pureModeEnabled", label: "纯净模式" },
        { on: "开启引用回复", off: "关闭引用回复", key: "useReply", label: "引用回复" },
        { on: "开启流式请求", off: "关闭流式请求", key: "enableStream", label: "流式请求" },
        { on: "开启识别图片", off: "关闭识别图片", key: "enableImage", label: "图片识别" },
        { on: "开启图片识别", off: "关闭图片识别", key: "enableImage", label: "图片识别" },
        { on: "开启联网请求", off: "关闭联网请求", key: "enableNetwork", label: "联网请求" },
        { on: "开启向知识库推送模组", off: "关闭向知识库推送模组", key: "pushModuleToKB", label: "向知识库推送模组" },
        { on: "开启知识库同步", off: "关闭知识库同步", key: "enableKBSync", label: "知识库同步" },
        { on: "开启知识库检索", off: "关闭知识库检索", key: "enableKBQuery", label: "知识库检索" },
      ];
      
      for (const toggle of toggleCommands) {
        if (text.match(new RegExp(`^${toggle.on}$`, "i"))) {
            let session = getSession(sessionKey);
            session.personalConfig[toggle.key] = true;
            updateSession(sessionKey, session);
            seal.replyToSender(ctx, msg, `✧ 当前环境已开启${toggle.label}`);
            return true;
        }
        if (text.match(new RegExp(`^${toggle.off}$`, "i"))) {
            let session = getSession(sessionKey);
            session.personalConfig[toggle.key] = false;
            updateSession(sessionKey, session);
            seal.replyToSender(ctx, msg, `✧ 当前环境已关闭${toggle.label}`);
            return true;
        }
      }

      const paramCommands = [
        { regex: /^配置系统提示\s*([\s\S]*)$/i, key: "systemPrompt", type: "string", label: "系统提示" },
        { regex: /^配置api端点\s*(.*)$/i, key: "apiUrl", type: "string", label: "API端点" },
        { regex: /^配置api[秘密]钥\s*(.*)$/i, key: "apiKey", type: "string", label: "API密钥" },
        { regex: /^配置外部模组(?:服务)?地址\s*(.*)$/i, key: "moduleBaseUrl", type: "string", label: "外部模组服务地址" },
        { regex: /^配置模型名称\s*(.*)$/i, key: "modelName", type: "string", label: "模型名称" },
        { regex: /^配置最大回复tokens数\s*(.*)$/i, key: "maxTokens", type: "int", label: "最大回复tokens数" },
        { regex: /^配置最大回复字符数\s*(.*)$/i, key: "maxChars", type: "int", label: "最大回复字符数" },
        { regex: /^配置网页抓取最大字符数\s*(.*)$/i, key: "webpageMaxLength", type: "int", label: "网页抓取最大字符数" },
        { regex: /^配置联网最大迭代次数\s*(.*)$/i, key: "maxNetworkIterations", type: "int", label: "联网最大迭代次数" },
        { regex: /^配置存储上下文轮数\s*(.*)$/i, key: "contextRounds", type: "int", label: "存储上下文轮数" },
        { regex: /^配置知识库同步api\s*(.*)$/i, key: "kbSyncApi", type: "string", label: "知识库同步API" },
        { regex: /^配置知识库检索api\s*(.*)$/i, key: "kbQueryApi", type: "string", label: "知识库检索API" },
        { regex: /^配置温度\s*(.*)$/i, key: "temperature", type: "float", label: "温度(Temperature)" },
        { regex: /^配置Top-p\s*(.*)$/i, key: "top_p", type: "float", label: "Top-p" },
        { regex: /^配置Top-k\s*(.*)$/i, key: "top_k", type: "int", label: "Top-k" },
        { regex: /^配置Presence Penalty\s*(.*)$/i, key: "presence_penalty", type: "float", label: "Presence Penalty" },
        { regex: /^配置Frequency Penalty\s*(.*)$/i, key: "frequency_penalty", type: "float", label: "Frequency Penalty" },
        { regex: /^配置随机种子\s*(.*)$/i, key: "seed", type: "int", label: "随机种子(Seed)" },
        { regex: /^配置深度\s*(.*)$/i, key: "depth", type: "int", label: "深度" }
      ];

      for (const cmd of paramCommands) {
        const match = text.match(cmd.regex);
        if (match) {
            let val = match[1].trim();
            let session = getSession(sessionKey);
            
            if (!val) {
                session.personalConfig[cmd.key] = null;
                updateSession(sessionKey, session);
                let clearMsg = `✧ 已清空个人${cmd.label} 恢复使用全局默认`;
                if (cmd.key === "systemPrompt") { clearMsg = "✧ 已清空个人系统提示 恢复使用全局基础历史和提示"; }
                seal.replyToSender(ctx, msg, clearMsg);
            } else {
                let finalVal = val;
                if (cmd.type === "float") finalVal = parseFloat(val);
                if (cmd.type === "int") finalVal = parseInt(val, 10);

                if ((cmd.type === "float" || cmd.type === "int") && isNaN(finalVal)) {
                    seal.replyToSender(ctx, msg, `✧配置失败 ${cmd.label}需要填入有效的数字`);
                } else {
                    session.personalConfig[cmd.key] = finalVal;
                    updateSession(sessionKey, session);
                    let successMsg = `✧ 当前环境${cmd.label}已设定为: ${finalVal}`;
                    if (cmd.key === "systemPrompt") { successMsg = "当前会话已配置个人系统提示"; }
                    if (["apiUrl", "apiKey", "modelName"].includes(cmd.key)) { successMsg = `✧ 当前环境已配置个人${cmd.label}`; }
                    seal.replyToSender(ctx, msg, successMsg);
                }
            }
            return true;
        }
      }

      const resetMatch = text.match(/^重置\s*(.*)$/i);
      if (resetMatch) {
        const target = resetMatch[1].trim().toLowerCase();
        let session = getSession(sessionKey);
        
        if (!target || target === "api" || target === "配置" || target === "全部" || target === "所有") {
            session.personalConfig = { 
  apiUrl: null, apiKey: null, modelName: null, 
  pureModeEnabled: null, useReply: null, enableStream: null, enableImage: null, debugMode: null, enableNetwork: null, pushModuleToKB: null,
  maxNetworkIterations: null, webpageMaxLength: null, enableKBSync: null, kbSyncApi: null,
  enableKBQuery: null, kbQueryApi: null,
  temperature: null, top_p: null, top_k: null,
  presence_penalty: null, frequency_penalty: null, seed: null,
  depth: null, filterIdEnabled: null,
  maxTokens: null, maxChars: null, contextRounds: null, systemPrompt: null,
  moduleBaseUrl: null, moduleData: null, fixedAnchors: {}
};
            updateSession(sessionKey, session);
            seal.replyToSender(ctx, msg, "✧ 当前环境配置已重置");
            return true;
        }

        const resetMap = {
            "api端点": "apiUrl", "api密钥": "apiKey", "api秘钥": "apiKey", "外部模组地址": "moduleBaseUrl",
"外部模组服务地址": "moduleBaseUrl",
"个人模组": "moduleData",
"模组": "moduleData", "模型名称": "modelName", "纯净模式": "pureModeEnabled",
            "引用回复": "useReply", "流式请求": "enableStream", "识别图片": "enableImage", "图片识别": "enableImage",
            "开启识别图片": "enableImage", "开启图片识别": "enableImage", "调试模式": "debugMode", "开启调试模式": "debugMode",
            "联网请求": "enableNetwork", "开启联网请求": "enableNetwork", 
            "向知识库推送模组": "pushModuleToKB", "开启向知识库推送模组": "pushModuleToKB",
            "网页抓取最大字符数": "webpageMaxLength", "联网最大迭代次数": "maxNetworkIterations",
            "知识库同步": "enableKBSync", "开启知识库同步": "enableKBSync", "知识库同步api": "kbSyncApi",
            "知识库检索": "enableKBQuery", "开启知识库检索": "enableKBQuery", "知识库检索api": "kbQueryApi",
            "最大回复tokens数": "maxTokens", "最大回复字符数": "maxChars", "存储上下文轮数": "contextRounds",
            "温度": "temperature", "temperature": "temperature", "top-p": "top_p", "top-k": "top_k",
            "presence penalty": "presence_penalty", "frequency penalty": "frequency_penalty", "随机种子": "seed",
            "seed": "seed", "深度": "depth", "识别码": "filterIdEnabled", "身份识别码": "filterIdEnabled", "系统提示": "systemPrompt"
        };

        const keyToReset = resetMap[target];
        if (keyToReset) {
            session.personalConfig[keyToReset] = null;
            updateSession(sessionKey, session);
            seal.replyToSender(ctx, msg, `✧ 当前环境的${target}已重置`);
        } else {
            seal.replyToSender(ctx, msg, `✧ 未找到配置项「${target}」。\n支持重置：系统提示/api端点/api密钥/识别图片/联网请求/外部模组地址/模型名称/随机种子/纯净模式/温度/深度等，或直接发送"重置配置"重置所有。`);
        }
        return true;
      }
      return false;
    };

    if (text.match(/^导出完整会话(.*)$/)) {
      if (ctx.privilegeLevel < 100) return seal.replyToSender(ctx, msg, "✧ 权限不足");
      const sessionName = text.match(/^导出完整会话(.*)$/)[1].trim(); 
      const result = await exportSession(ctx.player.userId, sessionName, true, dynamicConfig, ctx);
      seal.replyToSender(ctx, msg, result);
      return;
    }

    if (text.match(/^导出系统提示(.*)$/)) {
      if (ctx.privilegeLevel < 100) return seal.replyToSender(ctx, msg, "权限不足 仅骰主可以导出系统提示");
      dynamicConfig.refresh();
      let exportText = "";
      if (dynamicConfig.systemPrompt) exportText += `✧ 基础系统提示 ✧\n${dynamicConfig.systemPrompt}\n\n`;
      if (dynamicConfig.fixedRoleSetting) exportText += `✧ 固定角色设定 ✧\n${dynamicConfig.fixedRoleSetting}\n\n`;
      if (dynamicConfig.fictionRoleHistory) exportText += `✧ 虚构角色历史 ✧\n${dynamicConfig.fictionRoleHistory}\n\n`;
      if (dynamicConfig.postFictionRoleHistory) exportText += `✧ 后置虚构角色历史 ✧\n${dynamicConfig.postFictionRoleHistory}\n\n`;
      if (dynamicConfig.fictionHistory) exportText += `✧ 虚构历史记录 ✧\n${dynamicConfig.fictionHistory}\n\n`;
      if (dynamicConfig.postFictionHistory) exportText += `✧ 后置虚构历史记录 ✧\n${dynamicConfig.postFictionHistory}\n\n`;

      if (!exportText.trim()) return seal.replyToSender(ctx, msg, "✧ 未配置系统提示 无法导出");

      try {
        const response = await fetch("https://dpaste.com/api/v2/", {
          method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `content=${encodeURIComponent(exportText.trim())}&expiry_days=7`
        });
        if (!response.ok) throw new Error(`服务响应异常 ${response.status}`);
        const downloadUrl = (await response.text()).trim();
        seal.replyToSender(ctx, msg, `✧ 导出系统提示成功\n阅览地址：${downloadUrl}\n下载地址：${downloadUrl}.txt\n(链接有效期：7天)\n\n请在浏览器打开另存为下载`);
      } catch (error) { 
        console.error("导出系统提示失败", error); 
        seal.replyToSender(ctx, msg, `✧导出系统提示失败 ${error.message}`); 
      }
      return;
    }

    if (text.match(/^清理临时会话$/)) {
      if (ctx.privilegeLevel < 100) return seal.replyToSender(ctx, msg, "✧ 权限不足");
      const keys = Object.keys(tempSessionRegistry);
      for (let key of keys) {
         sessions.delete(key);
         ext.storageSet(sessionManager.autoSavePrefix + key, ""); 
      }
      tempSessionRegistry = {};
      ext.storageSet("openai_autosave_registry", JSON.stringify(tempSessionRegistry));
      seal.replyToSender(ctx, msg, `✧ 清理完毕 共释放「 ${keys.length} 」个不在用户会话清单里的临时对象及缓存`);
      return;
    }

    if (text.match(/^导出会话(.*)$/)) {
      const sessionName = text.match(/^导出会话(.*)$/)[1].trim();
      const result = await exportSession(ctx.player.userId, sessionName, false, dynamicConfig, ctx);
      seal.replyToSender(ctx, msg, result);
      return;
    }

    if (processManagementCommands()) return;

    try {
      if (text.includes(dynamicConfig.clearCmd)) {
        const oldSession = getSession(sessionKey);
        const newSession = new ChatGPTSession(dynamicConfig);
        newSession.personalConfig = { ...oldSession.personalConfig }; 
        newSession.personalConfig.fixedAnchors = {};
        updateSession(sessionKey, newSession); 

        const syncApiUrl = newSession.personalConfig.kbSyncApi || dynamicConfig.kbSyncApi;
        if (syncApiUrl) {
            try {
                seal.replyToSender(ctx, msg, "✧ 正在云端清扫 ...");
                const clearUrl = syncApiUrl.replace(/\/sync\/?$/, '/clear');
                
                await safeFetchWithTimeout(clearUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId: sessionKey })
                }, 30000);
                
                seal.replyToSender(ctx, msg, "✧ 云端记忆已清扫完毕\n" + dynamicConfig.clearMsg);
            } catch(e) {
                seal.replyToSender(ctx, msg, "✧ 云端清扫超时 本地记忆已重置\n" + dynamicConfig.clearMsg);
                if(dynamicConfig.debugMode) console.log("✧ 关键词触发清空失败", e);
            }
        } else {
            seal.replyToSender(ctx, msg, dynamicConfig.clearMsg);
        }
        return;
      }

      if (text.match(/^角色卡(?:清单|列表)$/)) {
        let session = getSession(sessionKey);
        const cards = Object.keys(session.lockedContents.roleCards);
        if (cards.length > 0) {
            const displayCards = cards.map(id => id === "" ? "基础角色卡" : `角色卡${id}`);
            seal.replyToSender(ctx, msg, `✧ 当前会话已锚定角色卡列表\n${displayCards.join("\n")}`);
        } else { seal.replyToSender(ctx, msg, "✧ 当前会话未锚定角色卡"); }
        return;
      }

      const loadRoleMatch = text.match(/^(?:加载|录入)角色卡(\d*)\s*([\s\S]*)$/);
      if (loadRoleMatch) {
        const cardId = loadRoleMatch[1] || "";
        let content = loadRoleMatch[2].trim();
        if (!content) {
            if (cardId === "") { content = seal.ext.getStringConfig(dynamicConfig.ext, "角色卡"); } 
            else {
                const regexConfig = seal.ext.getStringConfig(dynamicConfig.ext, "角色卡正则") || "";
                const regex = new RegExp(`<char${cardId}>([\\s\\S]*?)</char${cardId}>`, "i");
                const match = regexConfig.match(regex);
                if (match) { content = match[1].trim(); } 
                else { content = seal.ext.getStringConfig(dynamicConfig.ext, `角色卡${cardId}`); }
            }
        }
        if (!content || content.trim() === "") return seal.replyToSender(ctx, msg, `✧ 角色卡${cardId || "基础"}未配置`);
        let session = getSession(sessionKey);
        session.lockRoleCard(cardId, content.trim());
        updateSession(sessionKey, session); 
        seal.replyToSender(ctx, msg, `✧ 角色卡${cardId}已锚定至当前会话`);
        return;
      }

      const showRoleMatch = text.match(/^显示角色卡(\d*)$/);
      if (showRoleMatch) {
        const cardId = showRoleMatch[1] || "";
        let session = getSession(sessionKey);
        const cardData = session.lockedContents.roleCards[cardId];
        if (cardData && cardData.content) { seal.replyToSender(ctx, msg, `✧ 当前锚定的角色卡${cardId}\n${cardData.content}`); } 
        else { seal.replyToSender(ctx, msg, `✧ 当前会话未锚定角色卡${cardId}`); }
        return;
      }

      const clearAllRolesMatch = text.match(/^(?:清除|删除)全部角色卡$/);
      if (clearAllRolesMatch) {
        let session = getSession(sessionKey);
        session.clearAllRoleCards();
        updateSession(sessionKey, session);
        seal.replyToSender(ctx, msg, "✧ 已删除全部角色卡锚定");
        return;
      }

      const clearMatch = text.match(/^(?:清除|删除)(模组|角色卡)(\d*)$/);
      if (clearMatch) {
        const target = clearMatch[1];
        const cardId = clearMatch[2] || "";
        let session = getSession(sessionKey);
        if (target === "模组") {
            session.clearLockedContent("module");
            updateSession(sessionKey, session);
            seal.replyToSender(ctx, msg, "✧ 已删除模组锚定");
        } else if (target === "角色卡") {
            session.clearLockedContent("roleCard", cardId);
            updateSession(sessionKey, session);
            seal.replyToSender(ctx, msg, `✧ 已删除角色卡${cardId}锚定`);
        }
        return;
      }

      const loadModuleMatch = text.match(/^加载模组\s*(.*)$/);
if (loadModuleMatch) {
    let moduleName = loadModuleMatch[1].trim();
    let session = getSession(sessionKey);
    if (!moduleName) {
        session.personalConfig.moduleData = null;
        await syncModule(session, dynamicConfig);
        updateSession(sessionKey, session);
        seal.replyToSender(ctx, msg, "✧ 个人模组已清除 切换回后台模组");
        return;
    } else {
        seal.replyToSender(ctx, msg, `✧ 正在尝试获取模组 ${moduleName} ...`);
        try {
            const pConfig = session.personalConfig || {};
            let baseUrl = pConfig.moduleBaseUrl || dynamicConfig.moduleBaseUrl || "http" + "://127.0.0.1:8080/modules/";
            if (!baseUrl.endsWith('/')) { baseUrl += '/'; }
            const fileUrl = `${baseUrl}${encodeURIComponent(moduleName)}.txt`;
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error(`✧ HTTP状态异常 ${response.status}`);
            const content = await response.text();
            session.personalConfig.moduleData = content;
            await syncModule(session, dynamicConfig);
            updateSession(sessionKey, session);
            seal.replyToSender(ctx, msg, `✧ 模组「${moduleName}」加载成功`);
        } catch (error) {
            console.error("加载外部模组文件失败:", error);
            seal.replyToSender(ctx, msg, `✧ 加载模组「${moduleName}」失败\n(请确认该 txt 文件已部署在外部模组服务地址下)\n错误详情: ${error.message}`);
        }
        return;
    }
}

      if (/^(中止生成|停止生成)$/i.test(text)) {
          let session = getSession(sessionKey);
          if (session.isGenerating && session.abortController) {
              session.abortController.abort();
          }
          session.unlockGeneration();
          seal.replyToSender(ctx, msg, "✧ 已中止生成，锁已解除");
          return;
      }

      if (/^继续生成$/i.test(text)) {
          let session = getSession(sessionKey);
          if (session.dynamicContent.length === 0) return;
          const lastMsg = session.dynamicContent[session.dynamicContent.length - 1];
          if (lastMsg.role !== 'assistant') {
              seal.replyToSender(ctx, msg, "✧ 当前最后角色不是AI，无法继续生成");
              return;
          }
          if (!checkAPIConfig(session, true)) { return seal.replyToSender(ctx, msg, "✧ 当前环境未配置API，发送『AI手册』查看配置教程"); }
          
          const controller = createAbortController();
          session.lockGeneration(controller);
          try {
              const payload = session.buildPayload();
              const result = await sendOpenAIRequest(payload, ctx, msg, session, controller.signal);
              
              lastMsg.content += result.originalReply;
              lastMsg.filteredContent = lastMsg.filteredContent 
                  ? lastMsg.filteredContent + result.filteredReply 
                  : result.filteredReply;
                  
              const fullMsg = session.fullHistory.find(m => 
                  m._type === 'dynamic' && m.timestamp === lastMsg.timestamp && m.role === 'assistant');
              if (fullMsg) {
                  fullMsg.content = lastMsg.content;
                  fullMsg.filteredContent = lastMsg.filteredContent;
              }
              
              syncToKnowledgeBase(session, dynamicConfig, sessionKey);
              updateSession(sessionKey, session);
              await updateStatusBar(session, lastMsg.content, dynamicConfig);
          } catch (error) {
              if (error.name === 'AbortError' || error.message.includes('aborted')) return;
              seal.replyToSender(ctx, msg, `✧ 继续生成失败: ${error.message}`);
          } finally {
              session.unlockGeneration();
              updateSession(sessionKey, session);
          }
          return;
      }

if (text === "重新生成") {
          let session = getSession(sessionKey);
          if (!checkAPIConfig(session, true)) { return seal.replyToSender(ctx, msg, "✧ 当前环境未配置API，发送『AI手册』查看配置教程"); }

          if (session.isGenerating && session.abortController) {
              session.abortController.abort();
              session.unlockGeneration();
              await new Promise(r => setTimeout(r, 200));
          }

          let lastAiIdx = -1;
          for (let i = session.dynamicContent.length - 1; i >= 0; i--) {
              if (session.dynamicContent[i].role === 'assistant') { lastAiIdx = i; break; }
          }

          if (lastAiIdx !== -1) {
              const deletedMsg = session.dynamicContent[lastAiIdx];
              session.dynamicContent.splice(lastAiIdx, 1);
              for (let i = session.fullHistory.length - 1; i >= 0; i--) {
                  if (session.fullHistory[i]._type === 'dynamic' && session.fullHistory[i].role === 'assistant' && session.fullHistory[i].timestamp === deletedMsg.timestamp) {
                      session.fullHistory.splice(i, 1);
                      break;
                  }
              }
              rollbackStatusBar(session, dynamicConfig);
          } else {
              const lastMsg = session.dynamicContent[session.dynamicContent.length - 1];
              if (!lastMsg || lastMsg.role !== 'user') {
                  seal.replyToSender(ctx, msg, "✧ 没有找到可重新生成的回复");
                  return;
              }
          }

          const controller = createAbortController();
          session.lockGeneration(controller);
          try {
              await syncModule(session, dynamicConfig);
              
              // --- 修复：重新生成时补全缺失的上下文任务 (使其调用公开API进行RAG/联网检索) ---
              const lastMsg = session.dynamicContent[session.dynamicContent.length - 1];
              if (lastMsg && lastMsg.role === 'user') {
                  let processedText = lastMsg.content;
                  if (typeof processedText === 'string') {
                      // 过滤掉可能存在的身份识别码前缀，以免影响向量检索质量
                      processedText = processedText.replace(/^\(.*?\)\s*/, ""); 
                  }
                  await executeContextTasks(session, processedText, userId, sessionKey, dynamicConfig, ctx, msg);
              }
              // -------------------------------------------------------------------------

              syncToKnowledgeBase(session, dynamicConfig, sessionKey);

              const payload = session.buildPayload();

              const result = await sendOpenAIRequest(payload, ctx, msg, session, controller.signal);

              session.addDynamicMessage("assistant", result.originalReply, result.filteredReply);
              updateSession(sessionKey, session);
              await updateStatusBar(session, result.originalReply, dynamicConfig);
          } catch (error) {
              if (error.name === 'AbortError' || error.message.includes('aborted')) return;
              seal.replyToSender(ctx, msg, `✧ 重新生成失败: ${error.message}`);
          } finally {
              session.unlockGeneration();
              updateSession(sessionKey, session);
          }
          return;
      }

      const deleteMatch = text.match(/^删除轮数\s*(\d+)$/i);
      if (deleteMatch) {
          const roundsToDelete = parseInt(deleteMatch[1], 10);
          let session = getSession(sessionKey);
          if (isNaN(roundsToDelete) || roundsToDelete <= 0) return seal.replyToSender(ctx, msg, "✧ 无效轮数");
          
          const aiCount = session.dynamicContent.filter(m => m.role === 'assistant').length;
          if (aiCount === 0) return seal.replyToSender(ctx, msg, "✧ 无对话可删除");
          const deleteRounds = Math.min(roundsToDelete, aiCount);
          
          for (let r = 0; r < deleteRounds; r++) {
              let lastIdx = -1;
              for (let i = session.dynamicContent.length - 1; i >= 0; i--) {
                  if (session.dynamicContent[i].role === 'assistant') { lastIdx = i; break; }
              }
              if (lastIdx === -1) break;
              
              session.dynamicContent.splice(lastIdx, 1);
              while (lastIdx - 1 >= 0 && session.dynamicContent[lastIdx - 1].role === 'user') {
                  session.dynamicContent.splice(lastIdx - 1, 1);
                  lastIdx--;
              }
          }
          
          session.fullHistory = session.fullHistory.filter(m => 
              m._type !== 'dynamic' || session.dynamicContent.some(d => d.timestamp === m.timestamp && d.role === m.role));
              
          session.webSearchContext = null;
          session.ragContext = null;
          rollbackStatusBar(session, dynamicConfig);
          
          if (session.isGenerating && session.abortController) {
              session.abortController.abort();
          }
          session.unlockGeneration();
          updateSession(sessionKey, session);
          seal.replyToSender(ctx, msg, `✧ 已删除「 ${deleteRounds} 」轮对话 已清理关联网页缓存与知识库下挂`);
          return;
      }

      const showMatch = text.match(/^显示轮数\s*(\d+)$/i);
      if (showMatch) {
          const roundsToShow = parseInt(showMatch[1], 10);
          let session = getSession(sessionKey);
          if (isNaN(roundsToShow) || roundsToShow <= 0) return seal.replyToSender(ctx, msg, "✧ 无效轮数");
          if (session.dynamicContent.length === 0) return seal.replyToSender(ctx, msg, "没有可显示的对话内容");
          
          const displayRounds = [];
          let remaining = roundsToShow;
          let msgs = [...session.dynamicContent]; 
          
          while (remaining > 0 && msgs.length > 0) {
              let aiIdx = -1;
              for (let i = msgs.length - 1; i >= 0; i--) {
                  if (msgs[i].role === 'assistant') { aiIdx = i; break; }
              }
              if (aiIdx === -1) break;
              
              let start = aiIdx;
              while (start - 1 >= 0 && msgs[start - 1].role === 'user') start--;
              const roundMsgs = msgs.slice(start, aiIdx + 1);
              displayRounds.unshift(roundMsgs); 
              msgs.splice(start, roundMsgs.length);
              remaining--;
          }
          
          let formattedHistory = `✧ 最近${displayRounds.length}轮对话记录\n\n`;
          for (let r = 0; r < displayRounds.length; r++) {
              const round = displayRounds[r];
              for (const msg of round) {
                  const roleLabel = msg.role === 'user' ? "调查员" : "Owen";
                  let contentToShow = msg.filteredContent || msg.content;
                  if (typeof contentToShow === 'string') {
                      contentToShow = contentToShow.replace(/\[IMG:[^\]]+\]/g, "[图片]").replace(/\\f|\f/g, "").replace(/\\n/g, "\n").trim();
                  } else {
                      contentToShow = "[多模态内容]";
                  }
                  formattedHistory += `${roleLabel}：${contentToShow}\n\n`;
              }
          }
          seal.replyToSender(ctx, msg, formattedHistory);
          return;
      }

      let isPrimaryTrigger = dynamicConfig.triggerWord && text.includes(dynamicConfig.triggerWord);
      let isOtherTrigger = !isPrimaryTrigger && dynamicConfig.otherTriggerWords.length > 0 && dynamicConfig.otherTriggerWords.some(word => text.includes(word));

      if (ctx.isPrivate || isPrimaryTrigger || isOtherTrigger) {
          let session = getSession(sessionKey); 
          if (!checkAPIConfig(session, true)) return seal.replyToSender(ctx, msg, "✧ 未配置API，发送『AI手册』查看配置教程");
          
          let isPureMode = (session.personalConfig.pureModeEnabled !== null && session.personalConfig.pureModeEnabled !== undefined) ? session.personalConfig.pureModeEnabled : dynamicConfig.pureModeEnabled;
          let processedText = (isPureMode && isPrimaryTrigger) ? text.replace(dynamicConfig.triggerWord, "").trim() : text;

          if (session.isGenerating) {
              session.pendingUserMessages.push({
                  role: 'user',
                  content: processedText,
                  filteredContent: null,
                  userId: userId,
                  timestamp: Date.now()
              });
              return; 
          }

          let isEnableImage = (session.personalConfig.enableImage !== null && session.personalConfig.enableImage !== undefined) ? session.personalConfig.enableImage : dynamicConfig.enableImage;
          const cqImgRegex = /\[CQ:image,[^\]]*(?:url|file)=(https?:\/\/[^,\]]+)[^\]]*\]/g;
          const cqImgFallbackRegex = /\[CQ:image,[^\]]*\]/g;

          if (isEnableImage) {
              processedText = processedText.replace(cqImgRegex, (match, url) => {
                  let cleanUrl = url.replace(/&amp;/g, '&');
                  return `[IMG:${cleanUrl}]`;
              });
              processedText = processedText.replace(cqImgFallbackRegex, "");
              const imgUrlMatches = [...processedText.matchAll(/\[IMG:(https?:\/\/[^\]]+)\]/g)];
              for (const imgMatch of imgUrlMatches) {
                  const rawUrl = imgMatch[1];
                  const b64 = await fetchImageToBase64(rawUrl);
                  if (b64) {
                      processedText = processedText.replace(imgMatch[0], `[IMG:${b64}]`);
                  } else {
                      processedText = processedText.replace(imgMatch[0], "");
                  }
              }
          } else {
              processedText = processedText.replace(cqImgRegex, "");
              processedText = processedText.replace(cqImgFallbackRegex, "");
          }

          processedText = processedText.replace(/\{{1,2}随机数\}{1,2}/g, () => Math.floor(Math.random() * 100) + 1);

          await syncModule(session, dynamicConfig);
          await executeContextTasks(session, processedText, userId, sessionKey, dynamicConfig, ctx, msg);
          
session.addDynamicMessage("user", processedText, null, userId);
          syncToKnowledgeBase(session, dynamicConfig, sessionKey);
          updateSession(sessionKey, session);

          const controller = createAbortController();

          try {
              const payload = session.buildPayload();
              const result = await sendOpenAIRequest(payload, ctx, msg, session, controller.signal); 
              session.addDynamicMessage("assistant", result.originalReply, result.filteredReply);

              updateSession(sessionKey, session); 
              await updateStatusBar(session, result.originalReply, dynamicConfig);
              updateSession(sessionKey, session); 
          } catch (error) { 
              if (error.name !== 'AbortError' && !error.message.includes('aborted')) {
                  console.error("API请求失败:", error); 
              }
          } finally {
              session.unlockGeneration();
              
              while (session.pendingUserMessages && session.pendingUserMessages.length > 0) {
                  const pendingSnapshot = [...session.pendingUserMessages];
                  session.pendingUserMessages = []; 
                  
                  for (const pm of pendingSnapshot) {
                      session.addDynamicMessage('user', pm.content, pm.filteredContent, pm.userId);
                  }
                  
                  const subController = createAbortController();
                  session.lockGeneration(subController);
                  
                  try {
                      await syncModule(session, dynamicConfig);
                      await executeContextTasks(session, pendingSnapshot[pendingSnapshot.length - 1].content, pendingSnapshot[pendingSnapshot.length - 1].userId, sessionKey, dynamicConfig, ctx, msg);
                      
                      const payload = session.buildPayload();
                      const result = await sendOpenAIRequest(payload, ctx, msg, session, subController.signal);
                      session.addDynamicMessage('assistant', result.originalReply, result.filteredReply);
                      
                      updateSession(sessionKey, session);
                      await updateStatusBar(session, result.originalReply, dynamicConfig);
                  } catch (error) {
                      if (error.name !== 'AbortError' && !error.message.includes('aborted')) {
                          console.error("暂存消息处理失败:", error);
                      }
                  } finally {
                      session.unlockGeneration();
                  }
              }
              updateSession(sessionKey, session);
          }
          return;
      }

    } catch (error) { console.error("✧ 处理错误 ", error); seal.replyToSender(ctx, msg, `✧ 处理失败: ${error.message}`); }
  }

  async function sendOpenAIRequest(messages, ctx, msg, session, signal) {
    try {
      const pConfig = session?.personalConfig || {};
      const apiUrl = pConfig.apiUrl || dynamicConfig.apiUrl;
      const apiKey = pConfig.apiKey || dynamicConfig.apiKey;
      const modelNameRaw = pConfig.modelName || dynamicConfig.modelName;

      const models = (modelNameRaw || "").split(/[\s]+|\\n|\\r/).filter(m => m.trim() !== "");
      if (models.length === 0) throw new Error("✧ 模型名称未配置");

      const getValue = (key) => (pConfig[key] !== null && pConfig[key] !== undefined) ? pConfig[key] : dynamicConfig[key];

      const temperature = getValue("temperature");
      const top_p = getValue("top_p");
      const top_k = getValue("top_k");
      const presence_penalty = getValue("presence_penalty");
      const frequency_penalty = getValue("frequency_penalty");
      const seed = getValue("seed");
      const enableStream = getValue("enableStream");
      const useReply = getValue("useReply");
      const maxTokens = getValue("maxTokens");
      const enableImage = getValue("enableImage");
      const debugMode = getValue("debugMode"); 

      const finalMessages = await buildVisionMessages(messages, session, dynamicConfig);

      if (debugMode) {
          const logMessages = JSON.parse(JSON.stringify(finalMessages));
          logMessages.forEach(m => {
              if (Array.isArray(m.content)) {
                  m.content.forEach(c => {
                      if (c.type === "image_url" && c.image_url && c.image_url.url && c.image_url.url.length > 100) {
                          c.image_url.url = c.image_url.url.substring(0, 50) + "...[BASE64智能截断防卡死]";
                      }
                  });
              }
          });
          console.log("========== [调试模式: 发送给主干AI的 Final Messages] ==========\n" + JSON.stringify(logMessages, null, 2) + "\n============================================================");
      }

      async function makeRequest(payloadBody) {
          let contentObj = { text: "" };
          let fetchOptions = {
              method: "POST",
              headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
              body: JSON.stringify({ ...payloadBody, stream: enableStream })
          };
          
          // 仅在原生支持的情况下才把 signal 塞给底层 fetch
          if (signal && typeof AbortController !== 'undefined') {
              fetchOptions.signal = signal;
          }

          if (enableStream) {
              const response = await fetch(apiUrl, fetchOptions);
              if (!response.ok) { const errData = await response.json().catch(()=>({})); throw new Error(`API错误: ${errData.error?.message || response.statusText}`); }
              
              // 阻塞接收完整流数据
              const text = await response.text();
              
              // 强行打断判定
              if (signal && signal.aborted) { let e = new Error("aborted"); e.name = "AbortError"; throw e; }
              
              const lines = text.split("\n");
              let safeBuffer = "";
              
              for (const line of lines) {
                  if (line.startsWith("data: ")) {
                      const jsonStr = line.slice(6);
                      if (jsonStr.trim() === "[DONE]") continue;
                      try {
                          const data = JSON.parse(jsonStr);
                          const delta = data.choices[0]?.delta;
                          if (delta?.content) {
                              safeBuffer += delta.content;
                          }
                      } catch (e) {}
                  }
              }
              contentObj.text = safeBuffer;
          } else {
              const response = await fetch(apiUrl, fetchOptions);
              if (!response.ok) { const errData = await response.json().catch(()=>({})); throw new Error(`✧ 流式模式API错误: ${errData.error?.message || response.statusText}`); }
              
              // 非流式打断判定
              if (signal && signal.aborted) { let e = new Error("aborted"); e.name = "AbortError"; throw e; }
              
              const data = await response.json();
              contentObj.text = data.choices[0].message.content || "";
          }
          return contentObj;
      }


      let replyContent = "";
      let finalError = null;

      for (let mIdx = 0; mIdx < models.length; mIdx++) {
        const currentModel = models[mIdx];
        replyContent = ""; 
        const payload = {
          model: currentModel, max_tokens: maxTokens,
          temperature: temperature, top_p: top_p, top_k: top_k, presence_penalty: presence_penalty,
          frequency_penalty: frequency_penalty, seed: seed, stream: enableStream,
        };

        try {
          let currentPayload = { ...payload, messages: finalMessages };
          let res = await makeRequest(currentPayload);
          replyContent = res.text;
          finalError = null; 
          break;
        } catch (error) {
          finalError = error;
          if (debugMode) {
              console.error(`[调试模式] 模型 ${currentModel} 请求异常:`, error);
              seal.replyToSender(ctx, msg, `[调试日志] ${currentModel} 主干AI请求异常:\n${error.message}`);
          } else if (mIdx < models.length - 1) { 
              seal.replyToSender(ctx, msg, "✧ 响应失败 尝试使用次选模型 ..."); 
          }
        }
      }

      if (finalError) throw finalError;

      if (debugMode) console.log("[主干AI原始回复]:\n" + replyContent);
      const { filteredContent, codeBlocks } = filterContent(replyContent); 
      let safeContent = filteredContent;

      let displayReply = "";
      let cursor = 0;
      
      const protectRegex = /!\[.*?\]\([^\)]+\)|\[CQ:[^\]]+\]|\[IMG:[^\]]+\]|https?:\/\/[^\s\u4e00-\u9fa5]+|data:image\/[^;]+;base64,[^)\s\]]+/g;
      
      let match;
      
      while ((match = protectRegex.exec(safeContent)) !== null) {
          displayReply += renderText(safeContent.slice(cursor, match.index));
          displayReply += match[0];
          cursor = protectRegex.lastIndex;
      }
      displayReply += renderText(safeContent.slice(cursor));

      if (enableImage) {
        displayReply = displayReply.replace(/!\[.*?\]\((data:[^;]+;base64,([^\)]+))\)/g, (match, fullData, b64Data) => {
          return `[CQ:image,file=base64://${b64Data}]`;
        });
        displayReply = displayReply.replace(/!\[.*?\]\((https?:\/\/[^\)]+)\)/g, (match, url) => {
          return `[CQ:image,file=${url}]`;
        });
        displayReply = displayReply.replace(/\[IMG:(https?:\/\/[^\]]+)\]/g, (match, url) => {
          return `[CQ:image,file=${url}]`;
        });
        displayReply = displayReply.replace(/data:image\/[^;]+;base64,([a-zA-Z0-9+/=]+)/g, (match, b64Data) => {
          return `[CQ:image,file=base64://${b64Data}]`;
        });
      }

      const forcedBubbles = displayReply.split(/\\f|\f/);
      const splitLimit = 600; 
      const chunks = [];
      
      for (let bubble of forcedBubbles) {
        if (!bubble.trim()) continue; 
        if (bubble.length <= splitLimit) {
          chunks.push(bubble);
        } else {
          let remainingText = bubble;
          while (remainingText.length > splitLimit) {
            let splitIndex = remainingText.indexOf('\n');
            if (splitIndex === -1 || splitIndex > splitLimit) {
              chunks.push(remainingText.substring(0, splitLimit));
              remainingText = remainingText.substring(splitLimit);
            } else {
              let line = remainingText.substring(0, splitIndex).trim();
              if (line.length > 0) { chunks.push(line); }
              remainingText = remainingText.substring(splitIndex + 1);
            }
          }
          if (remainingText.trim().length > 0) { chunks.push(remainingText.trim()); }
        }
      }

      const msgId = msg.rawId || msg.messageId; 
      for (let i = 0; i < chunks.length; i++) {
        const segments = [];
        if (useReply && msgId && i === 0) { segments.push(`[CQ:reply,id=${msgId}]`); }
        segments.push(chunks[i]);
        seal.replyToSender(ctx, msg, segments.join(""));
        if (i < chunks.length - 1) { await new Promise(resolve => setTimeout(resolve, 800)); }
      }
      return { originalReply: replyContent, filteredReply: filteredContent };
    } catch (error) { 
        if (error.name === 'AbortError' || error.message.includes('aborted')) {
            throw error; 
        }
        seal.replyToSender(ctx, msg, `✧ 请求失败: ${error.message}`); 
        throw error; 
    }
  }


  ext.onNotCommandReceived = handleMessage;
  const cmdClear = seal.ext.newCmdItemInfo();
  cmdClear.name = "clr";
  cmdClear.help = "清除当前对话上下文及云端记忆"; 
  cmdClear.solve = (ctx, msg) => {
    const sessionKey = ctx.isPrivate ? `user_${ctx.player.userId}` : `group_${ctx.group?.groupId || "default"}`;
    const oldSession = getSession(sessionKey);
    const newSession = new ChatGPTSession(dynamicConfig);
    newSession.personalConfig = { ...oldSession.personalConfig }; 
    newSession.personalConfig.fixedAnchors = {};
    updateSession(sessionKey, newSession); 

    const syncApiUrl = newSession.personalConfig.kbSyncApi || dynamicConfig.kbSyncApi;
    if (syncApiUrl) {
        (async () => {
            try {
                seal.replyToSender(ctx, msg, "✧ 指令清理 正在清扫云端记忆 ...");
                const clearUrl = syncApiUrl.replace(/\/sync\/?$/, '/clear');
                
                await safeFetchWithTimeout(clearUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ sessionId: sessionKey })
                }, 30000);
                
                seal.replyToSender(ctx, msg, "✧ 云端清扫成功 \n" + dynamicConfig.clearMsg);
            } catch(e) {
                 seal.replyToSender(ctx, msg, "✧ 云端可能处理缓慢 本地已重置\n" + dynamicConfig.clearMsg);
            }
        })();
    } else {
        seal.replyToSender(ctx, msg, dynamicConfig.clearMsg);
    }

    return seal.ext.newCmdExecuteResult(true);
  };
  ext.cmdMap.clr = cmdClear;
}