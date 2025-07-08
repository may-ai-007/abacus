/**
 * 中国算盘（算盘）类
 * 负责绘制和处理算盘的交互
 */
class Abacus {
    /**
     * 构造函数
     * @param {string} canvasId - Canvas元素的ID
     */
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // 算盘尺寸
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // 算盘结构参数
        this.columns = 13; // 标准二五珠算盘有13列
        this.upperBeadsPerColumn = 2; // 每列上方有2颗算珠（二五珠算盘上珠为2颗，每颗值为5）
        this.lowerBeadsPerColumn = 5; // 每列下方有5颗算珠（二五珠算盘下珠为5颗，每颗值为1）
        
        // 计算每列宽度
        this.columnWidth = this.width / (this.columns + 1);
        
        // 算盘框架参数 - 减小框架尺寸，确保算珠不超出
        this.frameWidth = this.width * 0.82;  // 进一步减小宽度
        this.frameHeight = this.height * 0.72; // 进一步减小高度
        this.frameX = (this.width - this.frameWidth) / 2;
        this.frameY = (this.height - this.frameHeight) / 2;
        
        // 横梁位置（将算盘分为上下两部分）
        this.beamY = this.frameY + this.frameHeight * 0.35; // 调整横梁位置
        this.beamHeight = this.frameHeight * 0.05;
        
        // 算珠参数 - 调整算珠尺寸
        this.beadRadius = Math.min(this.columnWidth * 0.32, this.frameHeight / 20); // 增加珠子大小
        this.beadSpacing = this.beadRadius * 0.4; // 增加珠子间距
        
        // 加载算珠图片
        this.beadImage = new Image();
        this.beadImage.src = 'assets/images/bead.png';
        
        // 加载框架纹理图片
        this.woodTexture = new Image();
        this.woodTexture.src = 'assets/images/wood_texture.jpg';
        
        // 加载中国风背景图片
        this.bgImage = new Image();
        this.bgImage.src = 'assets/images/111.jpg';
        
        // 算珠状态 (二维数组，记录每个算珠的位置)
        this.beads = this.initBeads();
        
        // 交互状态
        this.isDragging = false;
        this.draggedBead = null;
        
        // 动画参数
        this.animating = false;
        this.animationQueue = [];
        
        // 绑定事件处理
        this.bindEvents();
        
        // 图片加载完成后初始绘制
        let loadedImages = 0;
        const totalImages = 3; // 现在有3张图片需要加载
        
        const onImageLoad = () => {
            loadedImages++;
            if (loadedImages === totalImages) {
                // 确保初始状态正确
                this.fixInitialPositions();
                this.draw();
            }
        };
        
        this.beadImage.onload = onImageLoad;
        this.woodTexture.onload = onImageLoad;
        this.bgImage.onload = onImageLoad;
        
        // 如果图片已经缓存，可能不会触发onload事件，所以这里也调用一次
        setTimeout(() => {
            this.fixInitialPositions();
            this.draw();
        }, 100);
    }
    
    /**
     * 修复初始位置，确保所有珠子位置正确
     */
    fixInitialPositions() {
        for (let col = 0; col < this.columns; col++) {
            // 修复上方算珠位置
            for (let i = 0; i < this.upperBeadsPerColumn; i++) {
                const bead = this.beads[col].upper[i];
                bead.active = false;
                bead.targetY = this.beamY - this.beamHeight/2 - (i + 1) * (this.beadRadius * 2 + this.beadSpacing);
                bead.y = bead.targetY; // 立即设置位置
            }
            
            // 修复下方算珠位置
            for (let i = 0; i < this.lowerBeadsPerColumn; i++) {
                const bead = this.beads[col].lower[i];
                bead.active = false;
                bead.targetY = this.beamY + this.beamHeight/2 + (i + 1) * (this.beadRadius * 2 + this.beadSpacing);
                bead.y = bead.targetY; // 立即设置位置
            }
        }
    }
    
    /**
     * 初始化算珠状态
     * @returns {Array} 算珠状态数组
     */
    initBeads() {
        const beads = [];
        
        for (let col = 0; col < this.columns; col++) {
            const columnBeads = {
                upper: [],
                lower: []
            };
            
            // 初始化上方算珠（默认都在上方）
            for (let i = 0; i < this.upperBeadsPerColumn; i++) {
                columnBeads.upper.push({
                    x: this.frameX + (col + 1) * this.columnWidth,
                    y: this.beamY - this.beamHeight/2 - (i + 1) * (this.beadRadius * 2 + this.beadSpacing),
                    active: false,
                    targetY: this.beamY - this.beamHeight/2 - (i + 1) * (this.beadRadius * 2 + this.beadSpacing)
                });
            }
            
            // 初始化下方算珠（默认都在下方）
            for (let i = 0; i < this.lowerBeadsPerColumn; i++) {
                columnBeads.lower.push({
                    x: this.frameX + (col + 1) * this.columnWidth,
                    y: this.beamY + this.beamHeight/2 + (i + 1) * (this.beadRadius * 2 + this.beadSpacing),
                    active: false,
                    targetY: this.beamY + this.beamHeight/2 + (i + 1) * (this.beadRadius * 2 + this.beadSpacing)
                });
            }
            
            beads.push(columnBeads);
        }
        
        return beads;
    }
    
    /**
     * 绑定事件处理
     */
    bindEvents() {
        // 鼠标按下事件
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        
        // 触摸事件（移动设备）
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        
        // 重置按钮
        const resetBtn = document.getElementById('reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', this.reset.bind(this));
        }
        
        // 设置动画循环
        this.animationLoop();
    }
    
    /**
     * 动画循环
     */
    animationLoop() {
        const animate = () => {
            let needsRedraw = false;
            
            // 更新所有算珠位置
            for (let col = 0; col < this.columns; col++) {
                // 更新上方算珠
                for (let i = 0; i < this.upperBeadsPerColumn; i++) {
                    const bead = this.beads[col].upper[i];
                    if (Math.abs(bead.y - bead.targetY) > 0.5) {
                        bead.y += (bead.targetY - bead.y) * 0.3;
                        needsRedraw = true;
                    } else {
                        bead.y = bead.targetY;
                    }
                }
                
                // 更新下方算珠
                for (let i = 0; i < this.lowerBeadsPerColumn; i++) {
                    const bead = this.beads[col].lower[i];
                    if (Math.abs(bead.y - bead.targetY) > 0.5) {
                        bead.y += (bead.targetY - bead.y) * 0.3;
                        needsRedraw = true;
                    } else {
                        bead.y = bead.targetY;
                    }
                }
            }
            
            // 如果有需要重绘的，则重绘
            if (needsRedraw) {
                this.draw();
            }
            
            // 继续动画循环
            requestAnimationFrame(animate);
        };
        
        // 开始动画循环
        animate();
    }
    
    /**
     * 处理鼠标按下事件
     * @param {MouseEvent} e - 鼠标事件
     */
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.checkBeadClick(x, y);
    }
    
    /**
     * 处理触摸开始事件
     * @param {TouchEvent} e - 触摸事件
     */
    handleTouchStart(e) {
        e.preventDefault(); // 防止滚动
        
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;
            
            this.checkBeadClick(x, y);
        }
    }
    
    /**
     * 检查是否点击了算珠
     * @param {number} x - 点击的X坐标
     * @param {number} y - 点击的Y坐标
     */
    checkBeadClick(x, y) {
        // 遍历所有算珠，检查点击
        for (let col = 0; col < this.columns; col++) {
            // 检查上方算珠
            for (let i = 0; i < this.upperBeadsPerColumn; i++) {
                const bead = this.beads[col].upper[i];
                const distance = Math.sqrt((x - bead.x) ** 2 + (y - bead.y) ** 2);
                
                if (distance <= this.beadRadius) {
                    this.toggleUpperBead(col, i);
                    return;
                }
            }
            
            // 检查下方算珠
            for (let i = 0; i < this.lowerBeadsPerColumn; i++) {
                const bead = this.beads[col].lower[i];
                const distance = Math.sqrt((x - bead.x) ** 2 + (y - bead.y) ** 2);
                
                if (distance <= this.beadRadius) {
                    this.toggleLowerBead(col, i);
                    return;
                }
            }
        }
    }
    
    /**
     * 切换上方算珠的状态
     * @param {number} col - 列号
     * @param {number} index - 算珠索引
     * @param {boolean} silent - 是否静音（不播放音效）
     */
    toggleUpperBead(col, index, silent = false) {
        if (col < 0 || col >= this.columns || index < 0 || index >= this.upperBeadsPerColumn) {
            return;
        }
        
        const bead = this.beads[col].upper[index];
        
        // 第二颗上珠只有在第一颗已经激活时才能激活
        if (index === 1 && !this.beads[col].upper[0].active && !bead.active) {
            return;
        }
        
        // 切换状态
        bead.active = !bead.active;
        
        if (bead.active) {
            // 激活状态 - 靠近横梁
            if (index === 0) {
                bead.targetY = this.beamY - this.beamHeight/2 - this.beadRadius * 1.5;
            } else {
                // 第二颗上珠的位置需要考虑第一颗的位置
                bead.targetY = this.beamY - this.beamHeight/2 - this.beadRadius * 1.5 - 
                    (this.beadRadius * 2 + this.beadSpacing/2);
            }
        } else {
            // 非激活状态 - 远离横梁
            bead.targetY = this.beamY - this.beamHeight/2 - 
                (index + 1) * (this.beadRadius * 2 + this.beadSpacing);
        }
        
        // 播放音效
        if (!silent && window.soundManager) {
            window.soundManager.playUpperBeadSound(col);
        }
    }
    
    /**
     * 切换下方算珠的状态
     * @param {number} col - 列号
     * @param {number} index - 算珠索引
     * @param {boolean} silent - 是否静音（不播放音效）
     */
    toggleLowerBead(col, index, silent = false) {
        if (col < 0 || col >= this.columns || index < 0 || index >= this.lowerBeadsPerColumn) {
            return;
        }
        
        const bead = this.beads[col].lower[index];
        const wasActive = bead.active;
        
        // 切换状态
        bead.active = !bead.active;
        
        // 计算激活状态下珠子的位置
        const activeBaseY = this.beamY + this.beamHeight/2 + this.beadRadius * 1.3;
        const activeSpacing = this.beadRadius * 2 * 0.8; // 减小激活状态下的间距
        
        if (bead.active) {
            // 激活状态 - 靠近横梁
            // 当点击某个珠子时，它上面的所有珠子也会移动
            for (let i = 0; i <= index; i++) {
                const currentBead = this.beads[col].lower[i];
                currentBead.active = true;
                currentBead.targetY = activeBaseY + (i * activeSpacing);
            }
        } else {
            // 非激活状态 - 远离横梁
            // 当点击某个珠子时，它下面的所有珠子也会移动
            for (let i = index; i < this.lowerBeadsPerColumn; i++) {
                const currentBead = this.beads[col].lower[i];
                currentBead.active = false;
                currentBead.targetY = this.beamY + this.beamHeight/2 + 
                    (i + 1) * (this.beadRadius * 2 + this.beadSpacing);
            }
        }
        
        // 播放音效
        if (!silent && window.soundManager && wasActive !== bead.active) {
            window.soundManager.playLowerBeadSound(col);
        }
    }
    
    /**
     * 绘制算盘
     */
    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 绘制中国风背景
        this.drawChineseBackground();
        
        // 绘制算盘框架
        this.drawFrame();
        
        // 绘制算盘横梁
        this.drawBeam();
        
        // 绘制算盘竖杆
        this.drawRods();
        
        // 绘制算珠
        this.drawBeads();
    }
    
    /**
     * 绘制中国风背景
     */
    drawChineseBackground() {
        this.ctx.save();
        
        // 如果背景图片已加载，则绘制
        if (this.bgImage.complete) {
            // 设置透明度，使背景不会太突兀
            this.ctx.globalAlpha = 0.15;
            
            // 创建平铺图案
            const pattern = this.ctx.createPattern(this.bgImage, 'repeat');
            this.ctx.fillStyle = pattern;
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            // 恢复透明度
            this.ctx.globalAlpha = 1.0;
        }
        
        this.ctx.restore();
    }
    
    /**
     * 绘制算盘框架
     */
    drawFrame() {
        // 设置框架样式
        this.ctx.save();
        
        // 使用木纹纹理填充框架
        if (this.woodTexture.complete) {
            const pattern = this.ctx.createPattern(this.woodTexture, 'repeat');
            this.ctx.fillStyle = pattern;
        } else {
            this.ctx.fillStyle = '#8B4513'; // 棕色备用
        }
        
        this.ctx.strokeStyle = '#5D2E0D';
        this.ctx.lineWidth = 4;
        
        // 绘制框架 - 使用圆角矩形使其更加精致
        this.ctx.beginPath();
        const radius = 15;
        this.ctx.moveTo(this.frameX + radius, this.frameY);
        this.ctx.lineTo(this.frameX + this.frameWidth - radius, this.frameY);
        this.ctx.arcTo(this.frameX + this.frameWidth, this.frameY, this.frameX + this.frameWidth, this.frameY + radius, radius);
        this.ctx.lineTo(this.frameX + this.frameWidth, this.frameY + this.frameHeight - radius);
        this.ctx.arcTo(this.frameX + this.frameWidth, this.frameY + this.frameHeight, this.frameX + this.frameWidth - radius, this.frameY + this.frameHeight, radius);
        this.ctx.lineTo(this.frameX + radius, this.frameY + this.frameHeight);
        this.ctx.arcTo(this.frameX, this.frameY + this.frameHeight, this.frameX, this.frameY + this.frameHeight - radius, radius);
        this.ctx.lineTo(this.frameX, this.frameY + radius);
        this.ctx.arcTo(this.frameX, this.frameY, this.frameX + radius, this.frameY, radius);
        this.ctx.closePath();
        
        this.ctx.fill();
        
        // 添加边框阴影
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowOffsetX = 5;
        this.ctx.shadowOffsetY = 5;
        this.ctx.stroke();
        
        this.ctx.restore();
        
        // 添加木纹效果
        this.drawWoodTexture();
        
        // 绘制外框装饰
        this.ctx.save();
        this.ctx.strokeStyle = '#3D1C02';
        this.ctx.lineWidth = 8;
        this.ctx.beginPath();
        this.ctx.rect(this.frameX - 8, this.frameY - 8, this.frameWidth + 16, this.frameHeight + 16);
        this.ctx.stroke();
        
        // 绘制角落装饰
        this.drawCornerDecoration(this.frameX - 4, this.frameY - 4);
        this.drawCornerDecoration(this.frameX + this.frameWidth + 4, this.frameY - 4);
        this.drawCornerDecoration(this.frameX - 4, this.frameY + this.frameHeight + 4);
        this.drawCornerDecoration(this.frameX + this.frameWidth + 4, this.frameY + this.frameHeight + 4);
        
        this.ctx.restore();
    }
    
    /**
     * 绘制角落装饰
     */
    drawCornerDecoration(x, y) {
        this.ctx.save();
        this.ctx.fillStyle = '#8B4513';
        this.ctx.beginPath();
        this.ctx.arc(x, y, 12, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 添加装饰性花纹
        this.ctx.strokeStyle = '#3D1C02';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + Math.cos(angle) * 10, y + Math.sin(angle) * 10);
        }
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    /**
     * 绘制木纹效果
     */
    drawWoodTexture() {
        this.ctx.save();
        this.ctx.globalAlpha = 0.1;
        this.ctx.strokeStyle = '#3D1C02';
        this.ctx.lineWidth = 1;
        
        // 水平木纹
        for (let y = this.frameY; y < this.frameY + this.frameHeight; y += 15) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.frameX, y);
            this.ctx.lineTo(this.frameX + this.frameWidth, y);
            
            // 添加一些随机变化，使木纹看起来更自然
            for (let x = this.frameX + 20; x < this.frameX + this.frameWidth; x += 20) {
                const offsetY = Math.random() * 3 - 1.5;
                this.ctx.lineTo(x, y + offsetY);
            }
            
            this.ctx.stroke();
        }
        
        // 添加一些垂直木纹
        for (let x = this.frameX + 30; x < this.frameX + this.frameWidth; x += 60) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.frameY);
            
            // 添加一些随机变化
            for (let y = this.frameY + 20; y < this.frameY + this.frameHeight; y += 20) {
                const offsetX = Math.random() * 4 - 2;
                this.ctx.lineTo(x + offsetX, y);
            }
            
            this.ctx.lineTo(x, this.frameY + this.frameHeight);
            this.ctx.stroke();
        }
        
        this.ctx.restore();
    }
    
    /**
     * 绘制算盘横梁
     */
    drawBeam() {
        // 设置横梁样式
        this.ctx.save();
        
        // 创建横梁渐变
        const beamGradient = this.ctx.createLinearGradient(
            this.frameX, this.beamY,
            this.frameX, this.beamY + this.beamHeight
        );
        beamGradient.addColorStop(0, '#8B4513');
        beamGradient.addColorStop(0.5, '#A0522D');
        beamGradient.addColorStop(1, '#8B4513');
        
        this.ctx.fillStyle = beamGradient;
        this.ctx.strokeStyle = '#3D1C02';
        this.ctx.lineWidth = 2;
        
        // 绘制横梁主体
        this.ctx.beginPath();
        this.ctx.rect(this.frameX, this.beamY - this.beamHeight/2, this.frameWidth, this.beamHeight);
        this.ctx.fill();
        this.ctx.stroke();
        
        // 添加横梁装饰 - 横梁上的纹理线条
        this.ctx.strokeStyle = '#3D1C02';
        this.ctx.lineWidth = 1;
        
        // 上部装饰线
        this.ctx.beginPath();
        this.ctx.moveTo(this.frameX, this.beamY - this.beamHeight/2 + 3);
        this.ctx.lineTo(this.frameX + this.frameWidth, this.beamY - this.beamHeight/2 + 3);
        this.ctx.stroke();
        
        // 下部装饰线
        this.ctx.beginPath();
        this.ctx.moveTo(this.frameX, this.beamY + this.beamHeight/2 - 3);
        this.ctx.lineTo(this.frameX + this.frameWidth, this.beamY + this.beamHeight/2 - 3);
        this.ctx.stroke();
        
        // 添加横梁高光
        this.ctx.globalAlpha = 0.3;
        this.ctx.fillStyle = '#FFF';
        this.ctx.beginPath();
        this.ctx.rect(this.frameX, this.beamY - this.beamHeight/2, this.frameWidth, this.beamHeight/4);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    /**
     * 绘制算盘竖杆
     */
    drawRods() {
        this.ctx.save();
        
        // 设置竖杆样式 - 使用渐变
        const rodGradient = this.ctx.createLinearGradient(
            0, this.frameY,
            0, this.frameY + this.frameHeight
        );
        rodGradient.addColorStop(0, '#6D3C14');
        rodGradient.addColorStop(0.5, '#8B4513');
        rodGradient.addColorStop(1, '#6D3C14');
        
        this.ctx.fillStyle = rodGradient;
        this.ctx.strokeStyle = '#3D1C02';
        this.ctx.lineWidth = 4;
        
        // 绘制竖杆 - 使用更粗的线条并添加金属质感
        for (let i = 1; i <= this.columns; i++) {
            const x = this.frameX + i * this.columnWidth;
            
            // 只绘制在框架宽度范围内的竖杆
            if (x > this.frameX + this.frameWidth - this.beadRadius) {
                continue;
            }
            
            // 绘制杆的阴影
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            this.ctx.shadowBlur = 5;
            this.ctx.shadowOffsetX = 2;
            this.ctx.shadowOffsetY = 0;
            
            // 绘制竖杆（使用矩形而不是线条，更粗更明显）
            const rodWidth = 4;
            this.ctx.beginPath();
            this.ctx.rect(x - rodWidth/2, this.frameY, rodWidth, this.frameHeight);
            this.ctx.fill();
            this.ctx.stroke();
            
            // 绘制杆的高光 - 增加金属质感
            this.ctx.shadowColor = 'transparent';
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.beginPath();
            this.ctx.rect(x - rodWidth/2 - 1, this.frameY, 1.5, this.frameHeight);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }
    
    /**
     * 绘制算珠
     */
    drawBeads() {
        // 遍历每列
        for (let col = 0; col < this.columns; col++) {
            const x = this.frameX + (col + 1) * this.columnWidth;
            
            // 如果珠子位置超出框架范围，则不绘制
            if (x > this.frameX + this.frameWidth - this.beadRadius) {
                continue;
            }
            
            // 绘制上方算珠
            for (let i = 0; i < this.upperBeadsPerColumn; i++) {
                const bead = this.beads[col].upper[i];
                this.drawBead(bead.x, bead.y, '#D22B2B'); // 红色算珠
            }
            
            // 绘制下方算珠
            for (let i = 0; i < this.lowerBeadsPerColumn; i++) {
                const bead = this.beads[col].lower[i];
                this.drawBead(bead.x, bead.y, '#D22B2B'); // 红色算珠
            }
        }
    }
    
    /**
     * 绘制单个算珠
     * @param {number} x - 算珠中心X坐标
     * @param {number} y - 算珠中心Y坐标
     * @param {string} color - 算珠颜色
     */
    drawBead(x, y, color) {
        this.ctx.save();
        
        // 绘制算珠主体 - 扁平椭圆形，典型的中国算盘珠子形状
        const radiusX = this.beadRadius;
        const radiusY = this.beadRadius * 0.55; // 更扁平的椭圆
        
        // 设置渐变 - 使算珠看起来更立体
        const gradient = this.ctx.createRadialGradient(
            x - radiusX * 0.3,
            y - radiusY * 0.3,
            0,
            x,
            y,
            radiusX
        );
        
        // 使用鲜艳的红色 - 传统中国算盘常用红色
        gradient.addColorStop(0, '#FF6B6B');
        gradient.addColorStop(0.4, '#D62828');
        gradient.addColorStop(1, '#9E1A1A');
        
        // 设置阴影
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 1;
        this.ctx.shadowOffsetY = 2;
        
        // 绘制珠子主体（扁平椭圆）
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 绘制珠子边缘
        this.ctx.strokeStyle = '#7C0000';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        
        // 阴影复位
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        
        // 添加中央穿孔 - 算盘珠子的特征
        const holeGradient = this.ctx.createRadialGradient(
            x, y, 0,
            x, y, radiusX * 0.15
        );
        holeGradient.addColorStop(0, '#3D1C02');
        holeGradient.addColorStop(0.6, '#3D1C02');
        holeGradient.addColorStop(1, '#000000');
        
        this.ctx.fillStyle = holeGradient;
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, radiusX * 0.15, radiusY * 0.15, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // 添加高光，让珠子看起来有光泽
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        this.ctx.beginPath();
        this.ctx.ellipse(
            x - radiusX * 0.3,
            y - radiusY * 0.4,
            radiusX * 0.2,
            radiusY * 0.15,
            Math.PI / 4,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
        
        // 添加边缘凹槽纹理 - 使珠子更有细节
        this.ctx.strokeStyle = 'rgba(80, 10, 10, 0.3)';
        this.ctx.lineWidth = 0.5;
        
        // 内圈
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, radiusX * 0.7, radiusY * 0.7, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        
        // 外圈
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, radiusX * 0.85, radiusY * 0.85, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    /**
     * 重置算盘
     * @param {boolean} silent - 是否静音（不播放音效）
     */
    reset(silent = false) {
        // 重置所有算珠位置
        for (let col = 0; col < this.columns; col++) {
            // 重置上方算珠
            for (let i = 0; i < this.upperBeadsPerColumn; i++) {
                const bead = this.beads[col].upper[i];
                bead.active = false;
                bead.targetY = this.beamY - this.beamHeight/2 - (i + 1) * (this.beadRadius * 2 + this.beadSpacing);
                bead.y = bead.targetY; // 立即更新位置，防止动画问题
            }
            
            // 重置下方算珠
            for (let i = 0; i < this.lowerBeadsPerColumn; i++) {
                const bead = this.beads[col].lower[i];
                bead.active = false;
                bead.targetY = this.beamY + this.beamHeight/2 + (i + 1) * (this.beadRadius * 2 + this.beadSpacing);
                bead.y = bead.targetY; // 立即更新位置，防止动画问题
            }
        }
        
        // 立即重绘
        this.draw();
        
        // 播放重置音效
        if (!silent && window.soundManager) {
            window.soundManager.playResetSound();
        }
    }
    
    /**
     * 获取当前算盘的值
     * @returns {Array} 每列的值数组
     */
    getValue() {
        const values = [];
        
        for (let col = 0; col < this.columns; col++) {
            let value = 0;
            
            // 计算上方算珠的值（每颗算珠值为5，二五珠算盘最多2颗）
            for (let i = 0; i < this.upperBeadsPerColumn; i++) {
                if (this.beads[col].upper[i].active) {
                    value += 5; // 上珠值为5
                }
            }
            
            // 计算下方算珠的值（每颗算珠值为1，二五珠算盘最多5颗）
            for (let i = 0; i < this.lowerBeadsPerColumn; i++) {
                if (this.beads[col].lower[i].active) {
                    value += 1; // 下珠值为1
                }
            }
            
            values.push(value);
        }
        
        return values;
    }
}

// 导出Abacus类
window.Abacus = Abacus; 