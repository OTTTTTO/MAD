/**
 * 讨论收藏夹系统
 * 用于保存重要讨论
 */

const fs = require('fs');
const path = require('path');

class FavoriteManager {
  constructor(options = {}) {
    this.dataDir = options.dataDir || 'data/favorites';
    this.favoritesFile = path.join(this.dataDir, 'favorites.json');
    this.foldersFile = path.join(this.dataDir, 'folders.json');

    // 确保目录存在
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }

    // 加载数据
    this.favorites = this._loadFavorites();
    this.folders = this._loadFolders();
  }

  // 加载收藏数据
  _loadFavorites() {
    if (fs.existsSync(this.favoritesFile)) {
      try {
        const content = fs.readFileSync(this.favoritesFile, 'utf8');
        return JSON.parse(content);
      } catch (err) {
        console.error('Failed to load favorites:', err.message);
      }
    }
    return {};
  }

  // 加载文件夹数据
  _loadFolders() {
    if (fs.existsSync(this.foldersFile)) {
      try {
        const content = fs.readFileSync(this.foldersFile, 'utf8');
        return JSON.parse(content);
      } catch (err) {
        console.error('Failed to load folders:', err.message);
      }
    }
    
    // 默认文件夹
    return [
      { id: 'default', name: '默认收藏夹', icon: '⭐', createdAt: Date.now() },
      { id: 'important', name: '重要讨论', icon: '❗', createdAt: Date.now() },
      { id: 'reference', name: '参考资料', icon: '📚', createdAt: Date.now() }
    ];
  }

  // 保存收藏数据
  _saveFavorites() {
    fs.writeFileSync(this.favoritesFile, JSON.stringify(this.favorites, null, 2), 'utf8');
  }

  // 保存文件夹数据
  _saveFolders() {
    fs.writeFileSync(this.foldersFile, JSON.stringify(this.folders, null, 2), 'utf8');
  }

  // 获取所有文件夹
  getAllFolders() {
    return this.folders;
  }

  // 获取单个文件夹
  getFolder(folderId) {
    return this.folders.find(f => f.id === folderId);
  }

  // 创建文件夹
  createFolder(name, icon = '📁') {
    const id = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

    const newFolder = {
      id,
      name,
      icon,
      createdAt: Date.now()
    };

    this.folders.push(newFolder);
    this._saveFolders();

    return newFolder;
  }

  // 更新文件夹
  updateFolder(folderId, updates) {
    const index = this.folders.findIndex(f => f.id === folderId);
    if (index === -1) {
      throw new Error(`Folder "${folderId}" not found`);
    }

    this.folders[index] = { ...this.folders[index], ...updates };
    this._saveFolders();

    return this.folders[index];
  }

  // 删除文件夹
  deleteFolder(folderId) {
    const index = this.folders.findIndex(f => f.id === folderId);
    if (index === -1) {
      throw new Error(`Folder "${folderId}" not found`);
    }

    // 不能删除默认文件夹
    if (['default', 'important', 'reference'].includes(folderId)) {
      throw new Error('Cannot delete default folder');
    }

    this.folders.splice(index, 1);

    // 删除该文件夹下的所有收藏
    for (const discussionId in this.favorites) {
      if (this.favorites[discussionId].folderId === folderId) {
        this.removeFavorite(discussionId);
      }
    }

    this._saveFolders();
  }

  // 添加到收藏
  addFavorite(discussionId, note = '', folderId = 'default') {
    // 检查是否已收藏
    if (this.favorites[discussionId]) {
      throw new Error(`Discussion "${discussionId}" is already favorited`);
    }

    this.favorites[discussionId] = {
      discussionId,
      note,
      folderId,
      createdAt: Date.now()
    };

    this._saveFavorites();

    return this.favorites[discussionId];
  }

  // 从收藏移除
  removeFavorite(discussionId) {
    if (!this.favorites[discussionId]) {
      return false;
    }

    delete this.favorites[discussionId];
    this._saveFavorites();

    return true;
  }

  // 检查是否已收藏
  isFavorited(discussionId) {
    return !!this.favorites[discussionId];
  }

  // 获取收藏详情
  getFavorite(discussionId) {
    return this.favorites[discussionId] || null;
  }

  // 更新收藏
  updateFavorite(discussionId, updates) {
    if (!this.favorites[discussionId]) {
      throw new Error(`Discussion "${discussionId}" is not favorited`);
    }

    this.favorites[discussionId] = {
      ...this.favorites[discussionId],
      ...updates
    };

    this._saveFavorites();

    return this.favorites[discussionId];
  }

  // 移动收藏到其他文件夹
  moveToFolder(discussionId, targetFolderId) {
    if (!this.favorites[discussionId]) {
      throw new Error(`Discussion "${discussionId}" is not favorited`);
    }

    const folder = this.getFolder(targetFolderId);
    if (!folder) {
      throw new Error(`Folder "${targetFolderId}" not found`);
    }

    this.favorites[discussionId].folderId = targetFolderId;
    this._saveFavorites();

    return this.favorites[discussionId];
  }

  // 获取文件夹下的所有收藏
  getFavoritesByFolder(folderId) {
    return Object.values(this.favorites)
      .filter(f => f.folderId === folderId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  // 获取所有收藏（按文件夹分组）
  getAllFavoritesGrouped() {
    const grouped = {};

    for (const folder of this.folders) {
      grouped[folder.id] = {
        folder,
        favorites: []
      };
    }

    for (const favorite of Object.values(this.favorites)) {
      if (grouped[favorite.folderId]) {
        grouped[favorite.folderId].favorites.push(favorite);
      }
    }

    return grouped;
  }

  // 搜索收藏
  searchFavorites(query) {
    const lowerQuery = query.toLowerCase();

    return Object.values(this.favorites).filter(f => {
      return f.note?.toLowerCase().includes(lowerQuery) ||
             f.discussionId.toLowerCase().includes(lowerQuery);
    });
  }

  // 获取统计
  getStats() {
    const stats = {
      totalFavorites: Object.keys(this.favorites).length,
      totalFolders: this.folders.length,
      byFolder: {}
    };

    for (const folder of this.folders) {
      stats.byFolder[folder.id] = {
        name: folder.name,
        count: 0
      };
    }

    for (const favorite of Object.values(this.favorites)) {
      if (stats.byFolder[favorite.folderId]) {
        stats.byFolder[favorite.folderId].count++;
      }
    }

    return stats;
  }

  // 导出收藏数据
  exportFavorites() {
    return {
      favorites: this.favorites,
      folders: this.folders,
      exportedAt: new Date().toISOString()
    };
  }

  // 导入收藏数据
  importFavorites(data) {
    if (data.favorites) {
      this.favorites = data.favorites;
      this._saveFavorites();
    }

    if (data.folders) {
      this.folders = data.folders;
      this._saveFolders();
    }
  }
}

module.exports = { FavoriteManager };
