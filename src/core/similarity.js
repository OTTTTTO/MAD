/**
 * 讨论相似度检测模块
 * 
 * 功能：
 * 1. 文本预处理（分词、停用词过滤）
 * 2. TF-IDF 向量化
 * 3. 余弦相似度计算
 * 4. 相似讨论查找
 * 
 * @module similarity
 * @version 1.0.0
 */

/**
 * 中文停用词列表
 */
const CHINESE_STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这',
  '可以', '这个', '那个', '什么', '怎么', '为什么', '因为', '所以', '但是', '如果', '虽然', '然后', '还是', '或者', '而且', '不过', '能够', '应该', '需要', '已经', '正在',
  '吗', '呢', '吧', '啊', '呀', '哦', '嗯', '哈'
]);

/**
 * 英文停用词列表
 */
const ENGLISH_STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'any', 'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very'
]);

/**
 * 分词器
 * 支持中文和英文分词
 */
class Tokenizer {
  /**
   * 对文本进行分词
   * @param {string} text - 输入文本
   * @returns {string[]} - 分词结果
   */
  static tokenize(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const tokens = [];

    // 移除特殊字符，保留中文、英文、数字
    const cleanText = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ');

    // 提取英文单词（连续的英文字母）
    const englishWords = cleanText.match(/[a-zA-Z]+/g) || [];
    tokens.push(...englishWords.map(w => w.toLowerCase()));

    // 提取中文字符（每个汉字作为一个 token）
    const chineseChars = cleanText.match(/[\u4e00-\u9fa5]/g) || [];
    tokens.push(...chineseChars);

    // 提取数字
    const numbers = cleanText.match(/\d+/g) || [];
    tokens.push(...numbers);

    return tokens;
  }

  /**
   * 过滤停用词
   * @param {string[]} tokens - 分词结果
   * @returns {string[]} - 过滤后的 tokens
   */
  static filterStopWords(tokens) {
    return tokens.filter(token => {
      const lower = token.toLowerCase();
      return !CHINESE_STOP_WORDS.has(lower) && !ENGLISH_STOP_WORDS.has(lower);
    });
  }

  /**
   * 预处理文本
   * @param {string} text - 输入文本
   * @returns {string[]} - 处理后的 tokens
   */
  static preprocess(text) {
    const tokens = this.tokenize(text);
    return this.filterStopWords(tokens);
  }
}

/**
 * TF-IDF 向量器
 */
class TFIDFVectorizer {
  constructor() {
    this.vocabulary = new Map(); // token -> index
    this.idf = new Map(); // token -> IDF value
    this.documentCount = 0;
  }

  /**
   * 构建词汇表和计算 IDF
   * @param {string[]} documents - 文档列表
   */
  fit(documents) {
    this.documentCount = documents.length;
    const docFrequency = new Map(); // token -> 文档频率

    // 统计每个 token 的文档频率
    documents.forEach(doc => {
      const tokens = Tokenizer.preprocess(doc);
      const uniqueTokens = new Set(tokens);

      uniqueTokens.forEach(token => {
        docFrequency.set(token, (docFrequency.get(token) || 0) + 1);
      });
    });

    // 构建词汇表并计算 IDF
    let index = 0;
    docFrequency.forEach((df, token) => {
      this.vocabulary.set(token, index++);
      // IDF = log(N / df)
      const idf = Math.log(this.documentCount / (df + 1)) + 1;
      this.idf.set(token, idf);
    });
  }

  /**
   * 将单个文档转换为 TF-IDF 向量
   * @param {string} document - 文档文本
   * @returns {Map<number, number>} - 稀疏向量（index -> value）
   */
  transform(document) {
    const tokens = Tokenizer.preprocess(document);

    // 计算 TF
    const termFreq = new Map();
    tokens.forEach(token => {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    });

    // 归一化 TF
    const maxTF = Math.max(...termFreq.values(), 1);
    termFreq.forEach((tf, token) => {
      termFreq.set(token, 0.5 + 0.5 * tf / maxTF);
    });

    // 计算 TF-IDF
    const vector = new Map();
    termFreq.forEach((tf, token) => {
      const index = this.vocabulary.get(token);
      if (index !== undefined) {
        const idf = this.idf.get(token) || 1;
        vector.set(index, tf * idf);
      }
    });

    return vector;
  }

  /**
   * 拟合并转换文档
   * @param {string[]} documents - 文档列表
   * @returns {Map<number, number>[]} - 向量列表
   */
  fitTransform(documents) {
    this.fit(documents);
    return documents.map(doc => this.transform(doc));
  }

  /**
   * 获取词汇表大小
   * @returns {number}
   */
  getVocabularySize() {
    return this.vocabulary.size;
  }
}

/**
 * 相似度计算器
 */
class SimilarityCalculator {
  /**
   * 计算两个稀疏向量的余弦相似度
   * @param {Map<number, number>} vec1 - 向量1
   * @param {Map<number, number>} vec2 - 向量2
   * @returns {number} - 相似度（0-1）
   */
  static cosineSimilarity(vec1, vec2) {
    if (vec1.size === 0 || vec2.size === 0) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    // 计算点积和 vec1 的模
    vec1.forEach((value, index) => {
      norm1 += value * value;
      if (vec2.has(index)) {
        dotProduct += value * vec2.get(index);
      }
    });

    // 计算 vec2 的模
    vec2.forEach((value) => {
      norm2 += value * value;
    });

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  /**
   * 提取两个文档的共同关键词
   * @param {string} doc1 - 文档1
   * @param {string} doc2 - 文档2
   * @param {number} limit - 最多返回的关键词数量
   * @returns {string[]} - 共同关键词列表
   */
  static getCommonKeywords(doc1, doc2, limit = 10) {
    const tokens1 = new Set(Tokenizer.preprocess(doc1));
    const tokens2 = new Set(Tokenizer.preprocess(doc2));

    const common = [];
    tokens1.forEach(token => {
      if (tokens2.has(token)) {
        common.push(token);
      }
    });

    // 按长度排序（长的词通常更有意义）
    common.sort((a, b) => b.length - a.length);

    return common.slice(0, limit);
  }
}

/**
 * 讨论相似度检测器
 */
class DiscussionSimilarityDetector {
  constructor() {
    this.vectorizer = new TFIDFVectorizer();
    this.discussionVectors = new Map(); // discussionId -> vector
  }

  /**
   * 从讨论中提取所有文本
   * @param {Object} discussion - 讨论对象
   * @returns {string} - 合并的文本
   */
  extractTextFromDiscussion(discussion) {
    const parts = [];

    // 添加主题
    if (discussion.topic) {
      parts.push(discussion.topic);
    }

    // 添加所有消息
    if (discussion.messages && Array.isArray(discussion.messages)) {
      discussion.messages.forEach(msg => {
        if (msg.content) {
          parts.push(msg.content);
        }
      });
    }

    return parts.join(' ');
  }

  /**
   * 训练模型（从讨论列表中学习）
   * @param {Map<string, Object>} discussions - 讨论列表
   */
  train(discussions) {
    const texts = [];

    discussions.forEach((discussion) => {
      const text = this.extractTextFromDiscussion(discussion);
      texts.push(text);
    });

    // 训练 TF-IDF 模型
    this.vectorizer.fit(texts);

    // 向量化所有讨论
    discussions.forEach((discussion, id) => {
      const text = this.extractTextFromDiscussion(discussion);
      const vector = this.vectorizer.transform(text);
      this.discussionVectors.set(id, vector);
    });
  }

  /**
   * 查找与目标讨论相似的其他讨论
   * @param {string} targetId - 目标讨论 ID
   * @param {Map<string, Object>} discussions - 所有讨论
   * @param {number} threshold - 相似度阈值（0-1）
   * @param {number} limit - 最多返回的数量
   * @returns {Array} - 相似讨论列表
   */
  findSimilar(targetId, discussions, threshold = 0.1, limit = 10) {
    const targetVector = this.discussionVectors.get(targetId);
    if (!targetVector) {
      return [];
    }

    const targetDiscussion = discussions.get(targetId);
    const targetText = this.extractTextFromDiscussion(targetDiscussion);

    const results = [];

    this.discussionVectors.forEach((vector, id) => {
      // 跳过自己
      if (id === targetId) {
        return;
      }

      // 计算相似度
      const similarity = SimilarityCalculator.cosineSimilarity(targetVector, vector);

      // 过滤低相似度的讨论
      if (similarity >= threshold) {
        const discussion = discussions.get(id);

        // 跳过不存在的讨论（数据不一致时可能发生）
        if (!discussion) {
          return;
        }

        // 提取共同关键词
        const otherText = this.extractTextFromDiscussion(discussion);
        const commonKeywords = SimilarityCalculator.getCommonKeywords(targetText, otherText);

        results.push({
          discussionId: id,
          topic: discussion.topic || '无主题',
          similarity: similarity,
          commonKeywords: commonKeywords,
          messageCount: discussion.messages ? discussion.messages.length : 0,
          createdAt: discussion.createdAt || 0,
          status: discussion.status || 'unknown'
        });
      }
    });

    // 按相似度降序排序
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, limit);
  }

  /**
   * 计算两个讨论之间的相似度
   * @param {string} id1 - 讨论1的ID
   * @param {string} id2 - 讨论2的ID
   * @returns {number} - 相似度（0-1）
   */
  calculateSimilarity(id1, id2) {
    const vec1 = this.discussionVectors.get(id1);
    const vec2 = this.discussionVectors.get(id2);

    if (!vec1 || !vec2) {
      return 0;
    }

    return SimilarityCalculator.cosineSimilarity(vec1, vec2);
  }

  /**
   * 更新单个讨论的向量
   * @param {string} discussionId - 讨论ID
   * @param {Object} discussion - 讨论对象
   */
  updateDiscussion(discussionId, discussion) {
    const text = this.extractTextFromDiscussion(discussion);
    const vector = this.vectorizer.transform(text);
    this.discussionVectors.set(discussionId, vector);
  }
}

/**
 * 导出模块
 */
module.exports = {
  Tokenizer,
  TFIDFVectorizer,
  SimilarityCalculator,
  DiscussionSimilarityDetector
};
