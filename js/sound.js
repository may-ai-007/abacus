/**
 * 算盘音效管理类
 * 负责加载和播放算盘操作的音效
 */
class SoundManager {
    constructor() {
        // 创建音频上下文
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // 音量控制
        this.gainNode = this.audioContext.createGain();
        this.gainNode.connect(this.audioContext.destination);
        this.gainNode.gain.value = 0.5; // 默认音量
        
        // 音效缓存
        this.soundBuffers = {
            upperBead: null,
            lowerBead: null,
            reset: null
        };
        
        // 先创建默认音效作为备用
        this.createDefaultSound('upperBead');
        this.createDefaultSound('lowerBead');
        this.createDefaultSound('reset');
        
        // 然后尝试加载音效文件
        this.loadSounds();
        
        // 绑定音量控制
        const volumeControl = document.getElementById('volume');
        if (volumeControl) {
            volumeControl.addEventListener('input', (e) => {
                this.setVolume(e.target.value);
            });
        }
        
        // 用于确保音频上下文已激活
        document.addEventListener('click', () => {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }, { once: true });
    }
    
    /**
     * 加载所有音效
     */
    loadSounds() {
        // 尝试加载音频文件
        this.loadSound('assets/sounds/upper_bead.mp3', 'upperBead');
        this.loadSound('assets/sounds/lower_bead.mp3', 'lowerBead');
    }
    
    /**
     * 加载单个音效
     * @param {string} url - 音效文件URL
     * @param {string} name - 音效名称
     */
    loadSound(url, name) {
        // 使用更健壮的错误处理
        try {
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.arrayBuffer();
                })
                .then(arrayBuffer => {
                    try {
                        return this.audioContext.decodeAudioData(arrayBuffer);
                    } catch (decodeError) {
                        console.error(`Failed to decode audio data for ${name}:`, decodeError);
                        return Promise.reject(decodeError);
                    }
                })
                .then(audioBuffer => {
                    this.soundBuffers[name] = audioBuffer;
                    console.log(`Sound ${name} loaded successfully`);
                })
                .catch(error => {
                    console.error(`Error loading sound ${name}:`, error);
                    // 加载失败时已有默认音效，无需再次创建
                });
        } catch (error) {
            console.error(`Exception during sound loading for ${name}:`, error);
            // 出现异常时已有默认音效，无需再次创建
        }
    }
    
    /**
     * 创建默认音效（当音效文件加载失败时使用）
     * @param {string} name - 音效名称
     */
    createDefaultSound(name) {
        // 创建一个简单的音效作为备用
        const duration = 0.15; // 音效持续时间（秒）
        const sampleRate = this.audioContext.sampleRate;
        const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
        const data = buffer.getChannelData(0);
        
        // 根据不同音效类型生成不同的波形
        if (name === 'upperBead') {
            // 上珠音效 - 较高的音调，类似木头碰撞声
            const frequency = 1200;
            for (let i = 0; i < buffer.length; i++) {
                const t = i / sampleRate;
                // 添加一些噪声使声音更自然
                const noise = (Math.random() * 2 - 1) * Math.exp(-30 * t);
                // 基本音调
                const tone = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-15 * t);
                // 混合噪声和音调
                data[i] = tone * 0.7 + noise * 0.3;
            }
        } else if (name === 'lowerBead') {
            // 下珠音效 - 较低的音调
            const frequency = 800;
            for (let i = 0; i < buffer.length; i++) {
                const t = i / sampleRate;
                // 添加一些噪声
                const noise = (Math.random() * 2 - 1) * Math.exp(-25 * t);
                // 基本音调
                const tone = Math.sin(2 * Math.PI * frequency * t) * Math.exp(-12 * t);
                // 混合噪声和音调
                data[i] = tone * 0.6 + noise * 0.4;
            }
        } else if (name === 'reset') {
            // 重置音效 - 一系列快速的点击声
            for (let i = 0; i < buffer.length; i++) {
                const t = i / sampleRate;
                // 创建3个间隔的点击声
                const click1 = Math.sin(2 * Math.PI * 1000 * t) * Math.exp(-30 * (t - 0.01) * (t - 0.01));
                const click2 = Math.sin(2 * Math.PI * 1200 * t) * Math.exp(-30 * (t - 0.06) * (t - 0.06));
                const click3 = Math.sin(2 * Math.PI * 900 * t) * Math.exp(-30 * (t - 0.11) * (t - 0.11));
                data[i] = (click1 + click2 + click3) * 0.3;
            }
        }
        
        this.soundBuffers[name] = buffer;
        console.log(`Created default sound for ${name}`);
    }
    
    /**
     * 播放指定的音效
     * @param {string} soundName - 音效名称
     * @param {Object} options - 播放选项
     */
    playSound(soundName, options = {}) {
        // 如果音频上下文被暂停，则恢复
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // 确保有可用的音效缓冲区
        let buffer = this.soundBuffers[soundName];
        if (!buffer) {
            console.warn(`Sound ${soundName} not loaded yet, using default`);
            this.createDefaultSound(soundName);
            buffer = this.soundBuffers[soundName];
            
            // 如果仍然没有缓冲区，则返回
            if (!buffer) {
                console.error(`Failed to create sound for ${soundName}`);
                return;
            }
        }
        
        // 创建音源节点
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        
        // 创建音量节点
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = options.volume !== undefined ? options.volume : 1.0;
        
        // 创建立体声平移节点
        const panNode = this.audioContext.createStereoPanner();
        panNode.pan.value = options.pan !== undefined ? options.pan : 0;
        
        // 连接节点
        source.connect(gainNode);
        gainNode.connect(panNode);
        panNode.connect(this.gainNode);
        
        // 播放音效
        try {
            source.start(options.delay !== undefined ? this.audioContext.currentTime + options.delay : 0);
            
            // 如果需要，添加音调变化
            if (options.pitch !== undefined) {
                source.playbackRate.value = options.pitch;
            }
            
            return source;
        } catch (error) {
            console.error(`Error playing sound ${soundName}:`, error);
            return null;
        }
    }
    
    /**
     * 设置音量
     * @param {number} value - 音量值（0-1）
     */
    setVolume(value) {
        this.gainNode.gain.value = value;
    }
    
    /**
     * 播放上珠移动的音效
     * @param {number} column - 列号，用于立体声定位
     */
    playUpperBeadSound(column) {
        const totalColumns = 13; // 总共13列
        
        // 根据列位置计算立体声位置（-1到1，左到右）
        const pan = column !== undefined ? (column / (totalColumns - 1)) * 2 - 1 : 0;
        
        // 添加一些随机变化使声音更自然
        const pitch = 0.95 + Math.random() * 0.15;
        const volume = 0.8 + Math.random() * 0.2;
        
        this.playSound('upperBead', {
            pan: pan,
            pitch: pitch,
            volume: volume
        });
    }
    
    /**
     * 播放下珠移动的音效
     * @param {number} column - 列号，用于立体声定位
     */
    playLowerBeadSound(column) {
        const totalColumns = 13; // 总共13列
        
        // 根据列位置计算立体声位置（-1到1，左到右）
        const pan = column !== undefined ? (column / (totalColumns - 1)) * 2 - 1 : 0;
        
        // 随机调整音调和音量，使声音更自然
        const pitch = 0.9 + Math.random() * 0.2; // 0.9-1.1之间的随机值
        const volume = 0.8 + Math.random() * 0.4; // 0.8-1.2之间的随机值
        
        this.playSound('lowerBead', {
            pitch: pitch,
            volume: volume,
            pan: pan
        });
    }
    
    /**
     * 播放重置按钮的音效
     */
    playResetSound() {
        // 播放一系列快速的点击声
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.playSound('upperBead', {
                    pitch: 0.9 + Math.random() * 0.2,
                    volume: 0.6,
                    pan: -0.5 + Math.random()
                });
            }, i * 100);
            
            setTimeout(() => {
                this.playSound('lowerBead', {
                    pitch: 0.9 + Math.random() * 0.2,
                    volume: 0.6,
                    pan: -0.5 + Math.random()
                });
            }, i * 100 + 50);
        }
    }
}

// 初始化音效管理器并使其全局可用
window.soundManager = new SoundManager(); 