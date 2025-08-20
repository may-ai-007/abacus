/**
 * 主程序入口
 * 负责初始化算盘和处理应用程序逻辑
 */
document.addEventListener('DOMContentLoaded', () => {
    // 初始化算盘
    const abacus = new Abacus('abacus');
    
    // 确保算盘实例可全局访问（用于调试）
    window.abacusInstance = abacus;
    
    // 处理窗口大小变化，添加防抖功能，避免频繁调整导致的渲染问题
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            resizeAbacus();
        }, 300); // 300ms防抖延迟
    });
    
    // 初始调整算盘尺寸
    resizeAbacus();
    
    // 添加重置按钮事件处理
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            abacus.reset(true);
        });
    }
    
    // 防止背景元素响应点击事件导致尺寸变化
    preventBackgroundClicks();
    
    /**
     * 防止背景元素响应点击事件导致尺寸变化
     */
    function preventBackgroundClicks() {
        // 获取算盘容器和主要元素
        const abacusContainer = document.querySelector('.abacus-container');
        
        if (abacusContainer) {
            // 阻止算盘容器的点击事件冒泡
            abacusContainer.addEventListener('click', (e) => {
                if (e.target === abacusContainer) {
                    e.stopPropagation();
                }
            }, true);
            
            // 阻止触摸事件的默认行为
            const preventDefaultTouch = (e) => {
                // 只有当触摸发生在算盘区域时才阻止默认行为
                const rect = abacusContainer.getBoundingClientRect();
                const touch = e.touches[0];
                if (touch) {
                    const x = touch.clientX;
                    const y = touch.clientY;
                    
                    if (x >= rect.left && x <= rect.right && 
                        y >= rect.top && y <= rect.bottom) {
                        e.preventDefault();
                    }
                }
            };
            
            // 添加触摸事件监听器
            abacusContainer.addEventListener('touchstart', preventDefaultTouch, { passive: false });
            abacusContainer.addEventListener('touchmove', preventDefaultTouch, { passive: false });
            abacusContainer.addEventListener('touchend', (e) => {
                // 只有当触摸发生在算盘容器上时才阻止传播
                if (e.target === abacusContainer) {
                    e.stopPropagation();
                }
            }, true);
        }
    }
    
    /**
     * 调整算盘尺寸以适应窗口
     */
    function resizeAbacus() {
        const container = document.querySelector('.abacus-container');
        const canvas = document.getElementById('abacus');
        
        if (!container || !canvas) return;
        
        // 获取容器宽度
        const containerWidth = container.clientWidth;
        
        // 保存当前算盘的状态
        const currentState = window.abacusInstance ? saveAbacusState(window.abacusInstance) : null;
        
        // 根据容器宽度调整画布大小
        if (containerWidth < 900) {
            // 在小屏幕上，保持宽高比
            const aspectRatio = 450 / 900; // 固定宽高比为0.5
            const newWidth = Math.floor(containerWidth - 20); // 留出一些边距，使用整数避免小数点渲染问题
            
            // 只有当尺寸真的发生变化时才重新初始化
            if (Math.abs(canvas.width - newWidth) > 2) {
                canvas.width = newWidth;
                canvas.height = Math.floor(newWidth * aspectRatio);
                
                // 重新初始化算盘（因为画布尺寸改变）
                initializeNewAbacus(currentState);
            }
        } else if (canvas.width !== 900) {
            // 恢复到默认尺寸
            canvas.width = 900;
            canvas.height = 450;
            
            // 重新初始化算盘
            initializeNewAbacus(currentState);
        }
    }
    
    /**
     * 重新初始化算盘
     * @param {Object} savedState - 可选的已保存状态
     */
    function initializeNewAbacus(savedState) {
        // 如果没有提供状态，则尝试保存当前状态
        const currentState = savedState || (window.abacusInstance ? saveAbacusState(window.abacusInstance) : null);
        
        try {
            // 创建新的算盘实例
            const newAbacus = new Abacus('abacus');
            
            // 更新全局实例
            window.abacusInstance = newAbacus;
            
            // 如果有保存的状态，则恢复
            if (currentState) {
                // 确保算盘完全初始化后再恢复状态
                setTimeout(() => {
                    restoreAbacusState(newAbacus, currentState);
                }, 50);
            }
        } catch (error) {
            console.error('初始化算盘时发生错误:', error);
        }
    }
    
    /**
     * 保存算盘状态
     * @param {Abacus} abacus - 算盘实例
     * @returns {Object} 保存的状态
     */
    function saveAbacusState(abacus) {
        const state = {
            beads: []
        };
        
        // 保存每列算珠的激活状态
        for (let col = 0; col < abacus.columns; col++) {
            const columnState = {
                upper: [],
                lower: []
            };
            
            // 保存上方算珠状态
            for (let i = 0; i < abacus.upperBeadsPerColumn; i++) {
                columnState.upper.push(abacus.beads[col].upper[i].active);
            }
            
            // 保存下方算珠状态
            for (let i = 0; i < abacus.lowerBeadsPerColumn; i++) {
                columnState.lower.push(abacus.beads[col].lower[i].active);
            }
            
            state.beads.push(columnState);
        }
        
        return state;
    }
    
    /**
     * 恢复算盘状态
     * @param {Abacus} abacus - 算盘实例
     * @param {Object} state - 保存的状态
     */
    function restoreAbacusState(abacus, state) {
        if (!state || !state.beads) return;
        
        // 恢复每列算珠的状态
        for (let col = 0; col < Math.min(abacus.columns, state.beads.length); col++) {
            const columnState = state.beads[col];
            
            // 恢复上方算珠状态
            for (let i = 0; i < Math.min(abacus.upperBeadsPerColumn, columnState.upper.length); i++) {
                if (columnState.upper[i] !== abacus.beads[col].upper[i].active) {
                    abacus.toggleUpperBead(col, i, true); // 添加静音参数
                }
            }
            
            // 恢复下方算珠状态
            for (let i = 0; i < Math.min(abacus.lowerBeadsPerColumn, columnState.lower.length); i++) {
                if (columnState.lower[i] !== abacus.beads[col].lower[i].active) {
                    abacus.toggleLowerBead(col, i, true); // 添加静音参数
                }
            }
        }
        
        // 重绘算盘
        abacus.draw();
    }
    
    // 添加使用说明按钮
    const controlsDiv = document.querySelector('.controls');
    if (controlsDiv) {
        const helpButton = document.createElement('button');
        helpButton.id = 'help-btn';
        helpButton.textContent = '详细说明 Instructions';
        helpButton.addEventListener('click', showHelp);
        
        // 查找按钮组，如果存在则添加到按钮组，否则直接添加到控制区
        const buttonsGroup = document.querySelector('.buttons-group');
        if (buttonsGroup) {
            buttonsGroup.appendChild(helpButton);
        } else {
            controlsDiv.appendChild(helpButton);
        }
    }
    
    // 初始化全屏模式
    initFullscreenMode();
    
    /**
     * 初始化全屏模式
     */
    function initFullscreenMode() {
        // 获取全屏按钮和模态框
        const fullscreenBtn = document.getElementById('fullscreen-btn');
        const fullscreenModal = document.getElementById('fullscreen-modal');
        const closeFullscreen = document.querySelector('.close-fullscreen');
        const fullscreenCanvas = document.getElementById('fullscreen-abacus');
        
        if (!fullscreenBtn || !fullscreenModal || !closeFullscreen || !fullscreenCanvas) {
            console.error('全屏模式初始化失败：找不到必要的DOM元素');
            return;
        }
        
        // 全屏算盘实例
        let fullscreenAbacus = null;
        
        // 点击全屏按钮显示模态框
        fullscreenBtn.addEventListener('click', () => {
            fullscreenModal.style.display = 'block';
            
            // 调整全屏算盘尺寸
            resizeFullscreenAbacus();
            
            // 创建全屏算盘实例
            if (!fullscreenAbacus) {
                fullscreenAbacus = new Abacus('fullscreen-abacus');
            }
            
            // 复制当前算盘的状态到全屏算盘
            copyAbacusState(abacus, fullscreenAbacus, true); // 添加静音参数
            
            // 禁止背景滚动
            document.body.style.overflow = 'hidden';
        });
        
        // 点击关闭按钮隐藏模态框
        closeFullscreen.addEventListener('click', () => {
            fullscreenModal.style.display = 'none';
            
            // 复制全屏算盘的状态到主算盘
            if (fullscreenAbacus) {
                copyAbacusState(fullscreenAbacus, abacus, true); // 添加静音参数
            }
            
            // 恢复背景滚动
            document.body.style.overflow = 'auto';
            
            // 退出全屏后重新调整主算盘尺寸，但不重新初始化
            setTimeout(() => {
                // 保存当前状态
                const currentState = saveAbacusState(abacus);
                
                // 仅调整尺寸，不重新初始化
                const container = document.querySelector('.abacus-container');
                const canvas = document.getElementById('abacus');
                
                if (container && canvas) {
                    // 获取容器宽度
                    const containerWidth = container.clientWidth;
                    
                    // 根据容器宽度调整画布大小
                    if (containerWidth < 900) {
                        // 在小屏幕上，保持宽高比
                        const aspectRatio = 450 / 900; // 固定宽高比为0.5
                        const newWidth = Math.floor(containerWidth - 20); // 留出一些边距，使用整数避免小数点渲染问题
                        
                        // 只有当尺寸真的发生变化时才重新设置
                        if (Math.abs(canvas.width - newWidth) > 2) {
                            canvas.width = newWidth;
                            canvas.height = Math.floor(newWidth * aspectRatio);
                            
                            // 更新算盘尺寸相关参数，但不重新初始化
                            abacus.width = canvas.width;
                            abacus.height = canvas.height;
                            abacus.columnWidth = abacus.width / (abacus.columns + 1);
                            abacus.frameWidth = abacus.width * 0.82;
                            abacus.frameHeight = abacus.height * 0.72;
                            abacus.frameX = (abacus.width - abacus.frameWidth) / 2;
                            abacus.frameY = (abacus.height - abacus.frameHeight) / 2;
                            abacus.beamY = abacus.frameY + abacus.frameHeight * 0.35;
                            abacus.beamHeight = abacus.frameHeight * 0.05;
                            abacus.beadRadius = Math.min(abacus.columnWidth * 0.32, abacus.frameHeight / 20);
                            abacus.beadSpacing = abacus.beadRadius * 0.4;
                            
                            // 重新渲染静态元素
                            abacus.prerenderStaticElements();
                            
                            // 恢复珠子状态
                            restoreAbacusState(abacus, currentState);
                            
                            // 强制重绘
                            abacus.needsRedraw = true;
                        }
                    } else if (canvas.width !== 900) {
                        // 恢复到默认尺寸
                        canvas.width = 900;
                        canvas.height = 450;
                        
                        // 更新算盘尺寸相关参数，但不重新初始化
                        abacus.width = canvas.width;
                        abacus.height = canvas.height;
                        abacus.columnWidth = abacus.width / (abacus.columns + 1);
                        abacus.frameWidth = abacus.width * 0.82;
                        abacus.frameHeight = abacus.height * 0.72;
                        abacus.frameX = (abacus.width - abacus.frameWidth) / 2;
                        abacus.frameY = (abacus.height - abacus.frameHeight) / 2;
                        abacus.beamY = abacus.frameY + abacus.frameHeight * 0.35;
                        abacus.beamHeight = abacus.frameHeight * 0.05;
                        abacus.beadRadius = Math.min(abacus.columnWidth * 0.32, abacus.frameHeight / 20);
                        abacus.beadSpacing = abacus.beadRadius * 0.4;
                        
                        // 重新渲染静态元素
                        abacus.prerenderStaticElements();
                        
                        // 恢复珠子状态
                        restoreAbacusState(abacus, currentState);
                        
                        // 强制重绘
                        abacus.needsRedraw = true;
                    }
                }
            }, 100);
        });
        
        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target === fullscreenModal) {
                fullscreenModal.style.display = 'none';
                
                // 复制全屏算盘的状态到主算盘
                if (fullscreenAbacus) {
                    copyAbacusState(fullscreenAbacus, abacus, true); // 添加静音参数
                }
                
                // 恢复背景滚动
                document.body.style.overflow = 'auto';
                
                // 退出全屏后重新调整主算盘尺寸，但不重新初始化
                setTimeout(() => {
                    // 保存当前状态
                    const currentState = saveAbacusState(abacus);
                    
                    // 仅调整尺寸，不重新初始化
                    const container = document.querySelector('.abacus-container');
                    const canvas = document.getElementById('abacus');
                    
                    if (container && canvas) {
                        // 获取容器宽度
                        const containerWidth = container.clientWidth;
                        
                        // 根据容器宽度调整画布大小
                        if (containerWidth < 900) {
                            // 在小屏幕上，保持宽高比
                            const aspectRatio = 450 / 900; // 固定宽高比为0.5
                            const newWidth = Math.floor(containerWidth - 20); // 留出一些边距，使用整数避免小数点渲染问题
                            
                            // 只有当尺寸真的发生变化时才重新设置
                            if (Math.abs(canvas.width - newWidth) > 2) {
                                canvas.width = newWidth;
                                canvas.height = Math.floor(newWidth * aspectRatio);
                                
                                // 更新算盘尺寸相关参数，但不重新初始化
                                abacus.width = canvas.width;
                                abacus.height = canvas.height;
                                abacus.columnWidth = abacus.width / (abacus.columns + 1);
                                abacus.frameWidth = abacus.width * 0.82;
                                abacus.frameHeight = abacus.height * 0.72;
                                abacus.frameX = (abacus.width - abacus.frameWidth) / 2;
                                abacus.frameY = (abacus.height - abacus.frameHeight) / 2;
                                abacus.beamY = abacus.frameY + abacus.frameHeight * 0.35;
                                abacus.beamHeight = abacus.frameHeight * 0.05;
                                abacus.beadRadius = Math.min(abacus.columnWidth * 0.32, abacus.frameHeight / 20);
                                abacus.beadSpacing = abacus.beadRadius * 0.4;
                                
                                // 重新渲染静态元素
                                abacus.prerenderStaticElements();
                                
                                // 恢复珠子状态
                                restoreAbacusState(abacus, currentState);
                                
                                // 强制重绘
                                abacus.needsRedraw = true;
                            }
                        } else if (canvas.width !== 900) {
                            // 恢复到默认尺寸
                            canvas.width = 900;
                            canvas.height = 450;
                            
                            // 更新算盘尺寸相关参数，但不重新初始化
                            abacus.width = canvas.width;
                            abacus.height = canvas.height;
                            abacus.columnWidth = abacus.width / (abacus.columns + 1);
                            abacus.frameWidth = abacus.width * 0.82;
                            abacus.frameHeight = abacus.height * 0.72;
                            abacus.frameX = (abacus.width - abacus.frameWidth) / 2;
                            abacus.frameY = (abacus.height - abacus.frameHeight) / 2;
                            abacus.beamY = abacus.frameY + abacus.frameHeight * 0.35;
                            abacus.beamHeight = abacus.frameHeight * 0.05;
                            abacus.beadRadius = Math.min(abacus.columnWidth * 0.32, abacus.frameHeight / 20);
                            abacus.beadSpacing = abacus.beadRadius * 0.4;
                            
                            // 重新渲染静态元素
                            abacus.prerenderStaticElements();
                            
                            // 恢复珠子状态
                            restoreAbacusState(abacus, currentState);
                            
                            // 强制重绘
                            abacus.needsRedraw = true;
                        }
                    }
                }, 100);
            }
        });
        
        // 处理窗口大小变化，调整全屏算盘尺寸，添加防抖功能
        let fullscreenResizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(fullscreenResizeTimeout);
            fullscreenResizeTimeout = setTimeout(() => {
                if (fullscreenModal.style.display === 'block' && fullscreenAbacus) {
                    resizeFullscreenAbacus();
                }
            }, 300); // 300ms防抖延迟
        });
        
        /**
         * 调整全屏算盘尺寸
         */
        function resizeFullscreenAbacus() {
            const container = document.querySelector('.fullscreen-abacus-container');
            
            if (!container || !fullscreenCanvas) return;
            
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            
            // 保持宽高比
            const aspectRatio = 0.5; // 高度是宽度的一半
            
            let newWidth, newHeight;
            
            if (containerWidth * aspectRatio <= containerHeight) {
                // 以宽度为基准
                newWidth = Math.floor(containerWidth * 0.95);
                newHeight = Math.floor(newWidth * aspectRatio);
            } else {
                // 以高度为基准
                newHeight = Math.floor(containerHeight * 0.95);
                newWidth = Math.floor(newHeight / aspectRatio);
            }
            
            // 只有当尺寸真的发生变化时才重新设置
            if (Math.abs(fullscreenCanvas.width - newWidth) > 2 || 
                Math.abs(fullscreenCanvas.height - newHeight) > 2) {
                fullscreenCanvas.width = newWidth;
                fullscreenCanvas.height = newHeight;
                
                // 如果全屏算盘已存在，需要重新调整
                if (fullscreenAbacus) {
                    fullscreenAbacus.width = newWidth;
                    fullscreenAbacus.height = newHeight;
                    fullscreenAbacus.needsRedraw = true;
                }
            }
        }
    }
    
    /**
     * 复制算盘状态
     * @param {Abacus} sourceAbacus - 源算盘
     * @param {Abacus} targetAbacus - 目标算盘
     * @param {boolean} silent - 是否静音（不播放音效）
     */
    function copyAbacusState(sourceAbacus, targetAbacus, silent = false) {
        if (!sourceAbacus || !targetAbacus) return;
        
        // 直接设置珠子的active状态和位置，而不是通过toggle方法
        for (let col = 0; col < Math.min(sourceAbacus.columns, targetAbacus.columns); col++) {
            // 复制上方算珠状态
            for (let i = 0; i < Math.min(sourceAbacus.upperBeadsPerColumn, targetAbacus.upperBeadsPerColumn); i++) {
                const sourceBead = sourceAbacus.beads[col].upper[i];
                const targetBead = targetAbacus.beads[col].upper[i];
                
                targetBead.active = sourceBead.active;
                
                if (sourceBead.active) {
                    // 计算靠近横梁的位置
                    if (i === 0) {
                        targetBead.targetY = targetAbacus.beamY - targetAbacus.beamHeight/2 - targetAbacus.beadRadius * 1.5;
                    } else {
                        targetBead.targetY = targetAbacus.beamY - targetAbacus.beamHeight/2 - targetAbacus.beadRadius * 1.5 - 
                            (targetAbacus.beadRadius * 2 + targetAbacus.beadSpacing/2);
                    }
                } else {
                    // 计算远离横梁的位置
                    targetBead.targetY = targetAbacus.beamY - targetAbacus.beamHeight/2 - 
                        (i + 1) * (targetAbacus.beadRadius * 2 + targetAbacus.beadSpacing);
                }
                
                // 立即更新位置，防止动画问题
                targetBead.y = targetBead.targetY;
            }
            
            // 复制下方算珠状态
            for (let i = 0; i < Math.min(sourceAbacus.lowerBeadsPerColumn, targetAbacus.lowerBeadsPerColumn); i++) {
                const sourceBead = sourceAbacus.beads[col].lower[i];
                const targetBead = targetAbacus.beads[col].lower[i];
                
                targetBead.active = sourceBead.active;
                
                if (sourceBead.active) {
                    // 计算靠近横梁的位置
                    const activeBaseY = targetAbacus.beamY + targetAbacus.beamHeight/2 + targetAbacus.beadRadius * 1.3;
                    const activeSpacing = targetAbacus.beadRadius * 2 * 0.8;
                    targetBead.targetY = activeBaseY + (i * activeSpacing);
                } else {
                    // 计算远离横梁的位置
                    targetBead.targetY = targetAbacus.beamY + targetAbacus.beamHeight/2 + 
                        (i + 1) * (targetAbacus.beadRadius * 2 + targetAbacus.beadSpacing);
                }
                
                // 立即更新位置，防止动画问题
                targetBead.y = targetBead.targetY;
            }
        }
        
        // 重绘目标算盘
        targetAbacus.draw();
    }
    
    /**
     * 显示使用说明
     */
    function showHelp() {
        // 创建模态对话框
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';
        modal.style.position = 'fixed';
        modal.style.zIndex = '1000';
        modal.style.left = '0';
        modal.style.top = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <h2>二五珠算盘使用说明</h2>
                <p>二五珠算盘是中国传统算盘的一种，由框架、横梁、竖杆和算珠组成。</p>
                <h3>算盘结构</h3>
                <ul>
                    <li>每列上方有2颗算珠（上珠），每颗代表5个单位</li>
                    <li>每列下方有5颗算珠（下珠），每颗代表1个单位</li>
                </ul>
                <h3>使用方法</h3>
                <ul>
                    <li>点击算珠可以移动它们</li>
                    <li>初始状态：所有珠子都远离横梁（不计数状态）</li>
                    <li>计数状态：珠子靠近横梁时才被计数</li>
                    <li>点击上方珠子：将其向横梁移动（计数5）或远离横梁（不计数）</li>
                    <li>上方第二颗珠子只有在第一颗已移动到横梁时才能移动</li>
                    <li>点击下方珠子：将其向横梁移动（计数1）或远离横梁（不计数）</li>
                    <li>点击某个下珠时，它和它上方的珠子会一起移动</li>
                    <li>每列可以表示0-15的数字</li>
                    <li>从右到左依次表示个位、十位、百位等</li>
                </ul>
                <h3>计数规则</h3>
                <ul>
                    <li>上方算珠（上珠）：靠近横梁时每颗值为5，远离横梁时值为0</li>
                    <li>下方算珠（下珠）：靠近横梁时每颗值为1，远离横梁时值为0</li>
                    <li>每列最大可表示数值为 (5×2) + (1×5) = 15</li>
                </ul>
                <h3>示例</h3>
                <p>要表示数字"123"，需要：</p>
                <ul>
                    <li>个位(右起第1列)：上珠不动，下珠有3颗靠近横梁，表示"3"</li>
                    <li>十位(右起第2列)：上珠有2颗靠近横梁，下珠有0颗靠近横梁，表示"10+0=10"</li>
                    <li>百位(右起第3列)：上珠有1颗靠近横梁，下珠有1颗靠近横梁，表示"5+1=6"</li>
                    <li>千位(右起第4列)：上珠有2颗靠近横梁，下珠有3颗靠近横梁，表示"10+3=13"</li>
                </ul>
                <p>要表示数字"567"，需要：</p>
                <ul>
                    <li>个位：上珠有1颗靠近横梁，下珠有2颗靠近横梁，表示"5+2=7"</li>
                    <li>十位：上珠有1颗靠近横梁，下珠有1颗靠近横梁，表示"5+1=6"</li>
                    <li>百位：上珠有1颗靠近横梁，下珠有0颗靠近横梁，表示"5+0=5"</li>
                </ul>
                <p>要表示数字"12"，需要：</p>
                <ul>
                    <li>个位：上珠不动，下珠有2颗靠近横梁，表示"0+2=2"</li>
                    <li>十位：上珠有1颗靠近横梁，下珠有1颗靠近横梁，表示"5+1=6"</li>
                </ul>
                
                <hr style="margin: 30px 0; border-top: 1px solid #ddd;">
                
                <h2>Chinese Abacus Instructions</h2>
                <p>The Chinese abacus (suanpan) is a traditional calculating tool consisting of a frame, beam, rods, and beads.</p>
                <h3>Structure</h3>
                <ul>
                    <li>Each column has 2 upper beads, each representing 5 units</li>
                    <li>Each column has 5 lower beads, each representing 1 unit</li>
                </ul>
                <h3>How to Use</h3>
                <ul>
                    <li>Click on beads to move them</li>
                    <li>Initial state: All beads away from the beam (not counting)</li>
                    <li>Counting state: Beads are counted only when moved toward the beam</li>
                    <li>Click upper beads: Move them toward the beam (count 5) or away from the beam (don't count)</li>
                    <li>The second upper bead can only be moved after the first one is already at the beam</li>
                    <li>Click lower beads: Move them toward the beam (count 1) or away from the beam (don't count)</li>
                    <li>When clicking a lower bead, it and all beads above it will move together</li>
                    <li>Each column can represent numbers from 0 to 15</li>
                    <li>The abacus reads from right to left: ones, tens, hundreds, etc.</li>
                </ul>
                <h3>Counting Rules</h3>
                <ul>
                    <li>Upper beads: Each counts as 5 when moved toward the beam, 0 when away</li>
                    <li>Lower beads: Each counts as 1 when moved toward the beam, 0 when away</li>
                    <li>Maximum value per column: (5×2) + (1×5) = 15</li>
                </ul>
                <h3>Examples</h3>
                <p>To represent the number "123":</p>
                <ul>
                    <li>Ones place (1st column from right): No upper beads, 3 lower beads toward the beam = "3"</li>
                    <li>Tens place (2nd column from right): 2 upper beads toward the beam, no lower beads = "10+0=10"</li>
                    <li>Hundreds place (3rd column from right): 1 upper bead and 1 lower bead toward the beam = "5+1=6"</li>
                    <li>Thousands place (4th column from right): 2 upper beads and 3 lower beads toward the beam = "10+3=13"</li>
                </ul>
                <p>To represent the number "567":</p>
                <ul>
                    <li>Ones place: 1 upper bead and 2 lower beads toward the beam = "5+2=7"</li>
                    <li>Tens place: 1 upper bead and 1 lower bead toward the beam = "5+1=6"</li>
                    <li>Hundreds place: 1 upper bead and no lower beads toward the beam = "5+0=5"</li>
                </ul>
                <p>To represent the number "12":</p>
                <ul>
                    <li>Ones place: No upper beads, 2 lower beads toward the beam = "0+2=2"</li>
                    <li>Tens place: 1 upper bead and 1 lower bead toward the beam = "5+1=6"</li>
                </ul>
            </div>
        `;
        document.body.appendChild(modal);
        
        // 设置模态内容样式
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.backgroundColor = '#fff';
            modalContent.style.margin = '15vh auto';
            modalContent.style.padding = '20px';
            modalContent.style.borderRadius = '8px';
            modalContent.style.width = '80%';
            modalContent.style.maxWidth = '600px';
            modalContent.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.3)';
            modalContent.style.maxHeight = '70vh';
            modalContent.style.overflowY = 'auto';
        }
        
        // 设置关闭按钮样式
        const closeBtn = modal.querySelector('.close');
        if (closeBtn) {
            closeBtn.style.color = '#aaa';
            closeBtn.style.float = 'right';
            closeBtn.style.fontSize = '28px';
            closeBtn.style.fontWeight = 'bold';
            closeBtn.style.cursor = 'pointer';
        }
        
        // 设置标题样式
        const h2List = modal.querySelectorAll('h2');
        h2List.forEach(h2 => {
            h2.style.color = '#8B4513';
            h2.style.marginBottom = '15px';
        });
        
        // 设置子标题样式
        const h3List = modal.querySelectorAll('h3');
        h3List.forEach(h3 => {
            h3.style.color = '#A0522D';
            h3.style.margin = '15px 0 10px';
        });
        
        // 设置列表样式
        const ulList = modal.querySelectorAll('ul');
        ulList.forEach(ul => {
            ul.style.marginLeft = '20px';
        });
        
        // 设置列表项样式
        const liList = modal.querySelectorAll('li');
        liList.forEach(li => {
            li.style.marginBottom = '5px';
        });
        
        // 点击关闭按钮或模态框外部时关闭
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        });
    }
}); 