// 视频播放器对象
const videoPlayer = document.getElementById('videoPlayer');
const videoList = document.getElementById('videoList');
const selectFolderBtn = document.getElementById('selectFolder');
const folderInput = document.getElementById('folderInput');

// 支持的视频格式
const supportedFormats = ['.mp4', '.avi', '.mkv', '.mov', '.wmv', '.flv', '.webm'];

// 格式化文件大小为人类可读格式
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 页面加载完成后初始化
window.addEventListener('DOMContentLoaded', () => {
    // 绑定事件
    selectFolderBtn.addEventListener('click', () => {
        folderInput.click();
    });
    
    folderInput.addEventListener('change', handleFolderSelect);
    
    // 初始化显示
    videoList.innerHTML = '<li style="text-align: center; color: #666;">点击"选择本地文件夹"按钮加载视频文件</li>';
    
    // 初始化推荐视频列表
    const recommendVideos = document.getElementById('recommendVideos');
    recommendVideos.innerHTML = '<div style="text-align: center; color: #666; padding: 20px;">选择文件夹后显示推荐视频</div>';
});

// 处理文件夹选择
function handleFolderSelect(event) {
    try {
        const files = Array.from(event.target.files);
        
        if (files.length === 0) {
            return;
        }
        
        // 过滤出视频文件
        const videoFiles = files.filter(file => {
            const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
            return supportedFormats.includes(ext);
        });
        
        if (videoFiles.length === 0) {
            videoList.innerHTML = '<li style="text-align: center; color: #666;">所选文件夹中没有找到支持的视频文件</li>';
            return;
        }
        
        // 按文件夹分组视频
        const groupedVideos = groupVideosByFolder(videoFiles);
        
        // 渲染视频列表
        renderVideoList(groupedVideos);
        
        // 生成推荐视频列表
        generateRecommendVideos(videoFiles);
    } catch (error) {
        console.error('处理文件夹时发生错误:', error);
        videoList.innerHTML = '<li style="text-align: center; color: #ff6b6b;">处理文件夹时发生错误，请重试</li>';
    }
}

// 按文件夹分组视频
function groupVideosByFolder(videos) {
    const grouped = {};
    
    videos.forEach(video => {
        // 获取文件路径
        const path = video.webkitRelativePath;
        let folder = '';
        
        // 提取文件夹部分
        if (path.includes('/')) {
            folder = path.substring(0, path.lastIndexOf('/'));
        }
        
        if (!grouped[folder]) {
            grouped[folder] = [];
        }
        
        grouped[folder].push(video);
    });
    
    return grouped;
}

// 渲染视频列表 - 优化大文件处理
function renderVideoList(groupedVideos) {
    videoList.innerHTML = '';
    
    // 遍历所有文件夹
    Object.keys(groupedVideos).forEach(folder => {
        // 创建文件夹标题
        const folderTitle = document.createElement('li');
        folderTitle.className = 'folder-title';
        folderTitle.innerHTML = `<span class="folder-icon">📁</span> ${folder || '根目录'}`;
        videoList.appendChild(folderTitle);
        
        // 遍历该文件夹下的视频
        groupedVideos[folder].forEach(video => {
            const li = document.createElement('li');
            li.className = 'video-item';
            
            // 添加文件大小信息
            const fileSize = formatFileSize(video.size);
            
            // 初始显示加载中的缩略图
            li.innerHTML = `
                <div class="video-thumbnail-container">
                    <div class="video-thumbnail loading"><span class="loading-icon">⏳</span></div>
                </div>
                <div class="video-info">
                    <span class="video-name">${video.name}</span>
                    <span class="video-size">${fileSize}</span>
                </div>
                <div class="video-actions">
                    <button class="delete-btn" title="从列表中移除">🗑️</button>
                </div>
            `;
            
            // 添加点击事件
            li.addEventListener('click', (e) => {
                // 如果点击的是删除按钮，不播放视频
                if (!e.target.closest('.delete-btn')) {
                    playLocalVideo(video, li);
                }
            });
            
            // 添加删除按钮点击事件
            const deleteBtn = li.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡，避免触发视频播放
                if (confirm(`确定要从列表中移除视频 "${video.name}" 吗？\n注意：这不会删除本地文件，只会从当前列表中移除。`)) {
                    li.remove();
                    console.log(`视频已从列表中移除: ${video.name}`);
                    
                    // 重新生成推荐视频列表，因为原列表可能已变化
                    const allVideos = Array.from(videoList.querySelectorAll('.video-item'))
                        .map(item => {
                            // 查找对应的视频文件对象
                            return files.find(f => f.name === item.querySelector('.video-name').textContent);
                        })
                        .filter(v => v); // 过滤掉undefined
                    
                    generateRecommendVideos(allVideos);
                }
            });
            
            videoList.appendChild(li);
            
            // 对于大文件，延迟生成缩略图，优先处理小文件
            if (video.size > 50 * 1024 * 1024) { // 大于50MB的文件延迟处理
                setTimeout(() => {
                    generateThumbnail(video, li.querySelector('.video-thumbnail'));
                }, 100); // 100ms延迟
            } else {
                // 小文件立即处理
                generateThumbnail(video, li.querySelector('.video-thumbnail'));
            }
        });
    });
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 生成视频缩略图（优化大文件处理，修复Blob URL错误）
function generateThumbnail(videoFile, thumbnailElement) {
    // 初始显示默认缩略图
    thumbnailElement.className = 'video-thumbnail';
    thumbnailElement.style.backgroundImage = 'linear-gradient(45deg, #666, #333)';
    thumbnailElement.innerHTML = '<span style="color: white; font-size: 24px;">📺</span>';
    
    // 尝试生成真实缩略图的最大文件大小（调整为100MB，增大覆盖范围）
    const maxSizeForThumbnail = 100 * 1024 * 1024; // 100MB
    
    if (videoFile.size > maxSizeForThumbnail) {
        // 对于超大文件，显示文件大小信息
        console.log(`文件过大，使用默认缩略图: ${videoFile.name} (${formatFileSize(videoFile.size)})`);
        return;
    }
    
    // 创建临时视频元素
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata'; // 只加载元数据，不加载整个视频
    tempVideo.crossOrigin = 'anonymous'; // 解决跨域问题
    
    // 创建本地视频URL
    const videoURL = URL.createObjectURL(videoFile);
    tempVideo.src = videoURL;
    
    // 重试次数计数器
    let retryCount = 0;
    const maxRetries = 2;
    
    // 尝试生成缩略图的函数
    const tryGenerateThumbnail = () => {
        // 设置超时，防止大文件加载时间过长
        const timeout = setTimeout(() => {
            console.log(`生成缩略图超时: ${videoFile.name}`);
            cleanupResources();
        }, 8000); // 8秒超时
        
        // 视频元数据加载完成后生成缩略图
        tempVideo.addEventListener('loadedmetadata', onMetadataLoaded);
        
        // 视频跳转完成后绘制缩略图
        tempVideo.addEventListener('seeked', onSeeked);
        
        // 监听加载错误
        tempVideo.addEventListener('error', onError);
        
        // 监听abort事件
        tempVideo.addEventListener('abort', onAbort);
        
        // 视频元数据加载完成处理函数
        function onMetadataLoaded() {
            clearTimeout(timeout);
            
            // 尝试跳转到不同的时间点获取帧
            // 第一次尝试0.5秒，重试时尝试1秒，再重试时尝试2秒
            const seekTime = retryCount === 0 ? 0.5 : retryCount === 1 ? 1 : 2;
            tempVideo.currentTime = seekTime;
        }
        
        // 视频跳转完成处理函数
        function onSeeked() {
            clearTimeout(timeout);
            
            try {
                // 创建canvas元素
                const canvas = document.createElement('canvas');
                canvas.width = 160; // 缩略图宽度
                canvas.height = 90; // 缩略图高度
                
                // 获取canvas上下文
                const ctx = canvas.getContext('2d');
                
                // 在canvas上绘制视频当前帧
                ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
                
                // 检查绘制是否成功（有些视频可能返回透明帧）
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                let hasContent = false;
                
                // 简单检查是否有非黑色像素
                for (let i = 0; i < imageData.data.length; i += 4) {
                    const r = imageData.data[i];
                    const g = imageData.data[i + 1];
                    const b = imageData.data[i + 2];
                    const a = imageData.data[i + 3];
                    
                    // 如果不是完全透明且不是黑色，认为有内容
                    if (a > 0 && !(r === 0 && g === 0 && b === 0)) {
                        hasContent = true;
                        break;
                    }
                }
                
                if (hasContent) {
                    // 将canvas转换为data URL，使用较低质量减少文件大小
                    const thumbnailURL = canvas.toDataURL('image/jpeg', 0.5);
                    
                    // 设置缩略图
                    thumbnailElement.style.backgroundImage = `url(${thumbnailURL})`;
                    thumbnailElement.innerHTML = '';
                    console.log(`成功生成缩略图: ${videoFile.name}`);
                } else {
                    // 透明或黑色帧，重试
                    handleRetry();
                }
            } catch (error) {
                console.error(`生成缩略图失败 [${videoFile.name}]:`, error);
                handleRetry();
            } finally {
                cleanupResources();
            }
        }
        
        // 错误处理函数
        function onError() {
            clearTimeout(timeout);
            console.error(`视频加载失败，无法生成缩略图 [${videoFile.name}]:`, tempVideo.error ? tempVideo.error.code : '未知错误');
            handleRetry();
            cleanupResources();
        }
        
        // 中断处理函数
        function onAbort() {
            clearTimeout(timeout);
            console.error(`视频加载被中断 [${videoFile.name}]`);
            cleanupResources();
        }
        
        // 重试处理函数
        function handleRetry() {
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`重试生成缩略图 (${retryCount}/${maxRetries}): ${videoFile.name}`);
                // 重新加载视频
                tempVideo.load();
            } else {
                console.log(`多次重试失败，使用默认缩略图: ${videoFile.name}`);
            }
        }
        
        // 清理资源函数
        function cleanupResources() {
            // 移除所有事件监听器
            tempVideo.removeEventListener('loadedmetadata', onMetadataLoaded);
            tempVideo.removeEventListener('seeked', onSeeked);
            tempVideo.removeEventListener('error', onError);
            tempVideo.removeEventListener('abort', onAbort);
            
            // 释放资源
            try {
                URL.revokeObjectURL(videoURL);
            } catch (error) {
                console.error('释放URL资源失败:', error);
            }
        }
    };
    
    // 开始尝试生成缩略图
    tryGenerateThumbnail();
}

// 播放本地视频 - 优化大文件处理，修复Blob URL错误
function playLocalVideo(videoFile, listItem) {
    // 清除之前的所有事件监听器
    videoPlayer.onended = null;
    videoPlayer.onerror = null;
    videoPlayer.onpause = null;
    videoPlayer.onplaying = null;
    
    // 停止当前播放
    videoPlayer.pause();
    
    // 保存当前视频URL，以便在适当的时候释放
    let currentVideoURL = null;
    
    try {
        // 对于大文件，使用Blob.slice()创建可流式访问的URL
        // 或者直接使用createObjectURL，浏览器会自动处理流式加载
        currentVideoURL = URL.createObjectURL(videoFile);
        
        // 更新视频源
        videoPlayer.src = currentVideoURL;
        
        // 优化视频加载行为
        videoPlayer.preload = 'metadata'; // 只加载元数据，减少初始加载时间
        
        // 播放视频
        videoPlayer.play().catch(error => {
            console.error('播放视频失败:', error);
            // 不使用alert，避免中断用户体验
            // 释放URL资源
            if (currentVideoURL) {
                URL.revokeObjectURL(currentVideoURL);
                currentVideoURL = null;
            }
        });
        
        // 更新视频列表高亮状态
        updateActiveVideo(listItem);
        
        // 视频播放结束后释放URL资源
        videoPlayer.onended = () => {
            if (currentVideoURL) {
                URL.revokeObjectURL(currentVideoURL);
                currentVideoURL = null;
            }
            updateActiveVideo(null);
        };
        
        // 视频加载失败后释放URL资源
        videoPlayer.onerror = () => {
            console.error('视频加载错误:', videoPlayer.error);
            if (currentVideoURL) {
                URL.revokeObjectURL(currentVideoURL);
                currentVideoURL = null;
            }
        };
        
        // 页面卸载时释放资源
        window.addEventListener('beforeunload', () => {
            if (currentVideoURL) {
                URL.revokeObjectURL(currentVideoURL);
                currentVideoURL = null;
            }
        });
        
    } catch (error) {
        console.error('处理视频时发生错误:', error);
        if (currentVideoURL) {
            URL.revokeObjectURL(currentVideoURL);
        }
    }
}

// 生成推荐视频列表 - B站风格
function generateRecommendVideos(allVideos) {
    const recommendVideos = document.getElementById('recommendVideos');
    
    // 随机选择8个视频作为推荐（如果视频数量不足则全部显示）
    const shuffled = [...allVideos].sort(() => 0.5 - Math.random());
    const recommendCount = Math.min(8, allVideos.length);
    const recommendedVideos = shuffled.slice(0, recommendCount);
    
    // 清空推荐列表
    recommendVideos.innerHTML = '';
    
    // 生成推荐视频卡片
    recommendedVideos.forEach(video => {
        const card = document.createElement('div');
        card.className = 'recommend-card';
        
        // 随机生成视频时长（模拟）
        const duration = generateRandomDuration();
        
        // 初始显示加载中的缩略图
        card.innerHTML = `
            <div class="recommend-thumbnail" style="background-image: linear-gradient(45deg, #666, #333);">
                <div class="recommend-duration">${duration}</div>
            </div>
            <div class="recommend-info">
                <div class="recommend-avatar"></div>
                <div class="recommend-detail">
                    <div class="recommend-title">${video.name}</div>
                    <div class="recommend-meta">本地视频 • ${Math.floor(Math.random() * 1000)}次播放</div>
                </div>
            </div>
        `;
        
        // 添加点击事件
        card.addEventListener('click', () => {
            // 在视频列表中找到对应的视频项
            const allVideoItems = videoList.querySelectorAll('.video-item');
            let targetItem = null;
            
            allVideoItems.forEach(item => {
                if (item.querySelector('.video-name').textContent === video.name) {
                    targetItem = item;
                }
            });
            
            playLocalVideo(video, targetItem);
        });
        
        recommendVideos.appendChild(card);
        
        // 生成缩略图
        generateRecommendThumbnail(video, card.querySelector('.recommend-thumbnail'));
    });
}

// 生成推荐视频缩略图
function generateRecommendThumbnail(videoFile, thumbnailElement) {
    // 初始显示默认缩略图
    thumbnailElement.style.backgroundImage = 'linear-gradient(45deg, #666, #333)';
    
    // 尝试生成真实缩略图的最大文件大小（与主列表保持一致，100MB）
    const maxSizeForThumbnail = 100 * 1024 * 1024; // 100MB
    
    if (videoFile.size > maxSizeForThumbnail) {
        // 对于超大文件，使用默认缩略图
        console.log(`文件过大，使用默认缩略图: ${videoFile.name} (${formatFileSize(videoFile.size)})`);
        return;
    }
    
    // 创建临时视频元素
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata'; // 只加载元数据，不加载整个视频
    tempVideo.crossOrigin = 'anonymous'; // 解决跨域问题
    
    // 创建本地视频URL
    const videoURL = URL.createObjectURL(videoFile);
    tempVideo.src = videoURL;
    
    // 重试次数计数器
    let retryCount = 0;
    const maxRetries = 2;
    
    // 尝试生成缩略图的函数
    const tryGenerateThumbnail = () => {
        // 设置超时，防止大文件加载时间过长
        const timeout = setTimeout(() => {
            console.log(`生成推荐缩略图超时: ${videoFile.name}`);
            cleanupResources();
        }, 8000); // 8秒超时
        
        // 视频元数据加载完成后生成缩略图
        tempVideo.addEventListener('loadedmetadata', onMetadataLoaded);
        
        // 视频跳转完成后绘制缩略图
        tempVideo.addEventListener('seeked', onSeeked);
        
        // 监听加载错误
        tempVideo.addEventListener('error', onError);
        
        // 监听abort事件
        tempVideo.addEventListener('abort', onAbort);
        
        // 视频元数据加载完成处理函数
        function onMetadataLoaded() {
            clearTimeout(timeout);
            
            // 尝试跳转到不同的时间点获取帧
            const seekTime = retryCount === 0 ? 0.5 : retryCount === 1 ? 1 : 2;
            tempVideo.currentTime = seekTime;
        }
        
        // 视频跳转完成处理函数
        function onSeeked() {
            clearTimeout(timeout);
            
            try {
                // 创建canvas元素
                const canvas = document.createElement('canvas');
                canvas.width = 320; // 缩略图宽度
                canvas.height = 180; // 缩略图高度
                
                // 获取canvas上下文
                const ctx = canvas.getContext('2d');
                
                // 在canvas上绘制视频当前帧
                ctx.drawImage(tempVideo, 0, 0, canvas.width, canvas.height);
                
                // 检查绘制是否成功
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                let hasContent = false;
                
                // 简单检查是否有非黑色像素
                for (let i = 0; i < imageData.data.length; i += 4) {
                    const r = imageData.data[i];
                    const g = imageData.data[i + 1];
                    const b = imageData.data[i + 2];
                    const a = imageData.data[i + 3];
                    
                    if (a > 0 && !(r === 0 && g === 0 && b === 0)) {
                        hasContent = true;
                        break;
                    }
                }
                
                if (hasContent) {
                    // 将canvas转换为data URL，使用较低质量减少文件大小
                    const thumbnailURL = canvas.toDataURL('image/jpeg', 0.5);
                    
                    // 设置缩略图
                    thumbnailElement.style.backgroundImage = `url(${thumbnailURL})`;
                    console.log(`成功生成推荐缩略图: ${videoFile.name}`);
                } else {
                    // 透明或黑色帧，重试
                    handleRetry();
                }
            } catch (error) {
                console.error(`生成推荐视频缩略图失败 [${videoFile.name}]:`, error);
                handleRetry();
            } finally {
                cleanupResources();
            }
        }
        
        // 错误处理函数
        function onError() {
            clearTimeout(timeout);
            console.error(`视频加载失败，无法生成推荐缩略图 [${videoFile.name}]:`, tempVideo.error ? tempVideo.error.code : '未知错误');
            handleRetry();
            cleanupResources();
        }
        
        // 中断处理函数
        function onAbort() {
            clearTimeout(timeout);
            console.error(`视频加载被中断 [${videoFile.name}]`);
            cleanupResources();
        }
        
        // 重试处理函数
        function handleRetry() {
            if (retryCount < maxRetries) {
                retryCount++;
                console.log(`重试生成推荐缩略图 (${retryCount}/${maxRetries}): ${videoFile.name}`);
                // 重新加载视频
                tempVideo.load();
            } else {
                console.log(`多次重试失败，使用默认缩略图: ${videoFile.name}`);
            }
        }
        
        // 清理资源函数
        function cleanupResources() {
            // 移除所有事件监听器
            tempVideo.removeEventListener('loadedmetadata', onMetadataLoaded);
            tempVideo.removeEventListener('seeked', onSeeked);
            tempVideo.removeEventListener('error', onError);
            tempVideo.removeEventListener('abort', onAbort);
            
            // 释放资源
            try {
                URL.revokeObjectURL(videoURL);
            } catch (error) {
                console.error('释放URL资源失败:', error);
            }
        }
    };
    
    // 开始尝试生成缩略图
    tryGenerateThumbnail();
}

// 生成随机视频时长（模拟）
function generateRandomDuration() {
    const minutes = Math.floor(Math.random() * 60);
    const seconds = Math.floor(Math.random() * 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// 更新当前播放的视频高亮状态
function updateActiveVideo(activeItem) {
    // 移除所有项的active类
    const allItems = videoList.querySelectorAll('.video-item');
    allItems.forEach(item => {
        item.classList.remove('active');
    });
    
    // 为当前项添加active类
    if (activeItem) {
        activeItem.classList.add('active');
    }
}

// 视频元数据加载完成事件
videoPlayer.addEventListener('loadedmetadata', () => {
    console.log('视频元数据加载完成:', {
        duration: videoPlayer.duration,
        width: videoPlayer.videoWidth,
        height: videoPlayer.videoHeight
    });
});