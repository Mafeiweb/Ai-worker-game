// UI 控制器
class UIController {
    constructor() {
        // DOM 元素
        this.moneyEl = document.getElementById('money');
        this.dayEl = document.getElementById('day');
        this.timeEl = document.getElementById('time');
        this.familyEl = document.getElementById('family');
        this.todayIncomeEl = document.getElementById('todayIncome');
        this.todayWorkEl = document.getElementById('todayWork');
        this.todayExpenseEl = document.getElementById('todayExpense');
        this.messageBox = document.getElementById('messageBox');
        this.messageText = document.querySelector('.message-text');
        this.gameOverOverlay = document.getElementById('gameOverOverlay');
        this.gameOverTitle = document.getElementById('gameOverTitle');
        this.gameOverMessage = document.getElementById('gameOverMessage');
        this.gameOverStats = document.getElementById('gameOverStats');

        // 按钮
        this.btnWork = document.getElementById('btnWork');
        this.btnGamble = document.getElementById('btnGamble');
        this.btnChild = document.getElementById('btnChild');
        this.btnRestart = document.getElementById('btnRestart');

        // 消息定时器
        this.messageTimer = null;

        // 绑定事件
        this.bindEvents();
    }

    bindEvents() {
        this.btnWork.addEventListener('click', () => game.work());
        this.btnGamble.addEventListener('click', () => game.gamble());
        this.btnChild.addEventListener('click', () => game.haveChild());
        this.btnRestart.addEventListener('click', () => {
            this.gameOverOverlay.classList.remove('show');
            game.restart();
        });
    }

    // 更新所有 UI
    updateAll() {
        this.updateMoney();
        this.updateTime();
        this.updateFamily();
        this.updateStats();
        this.updateButtons();
    }

    // 更新资金显示（支持负债显示）
    updateMoney(animate = false) {
        const money = game.state.money;
        const oldMoney = parseFloat(this.moneyEl.textContent.replace(/[$,M]/g, '')) || 0;

        // 格式化资金显示
        let moneyText;
        if (money < 0) {
            // 负数显示为负债
            const absMoney = Math.abs(money);
            if (absMoney >= 1000000) {
                moneyText = `负债 $${(absMoney / 1000000).toFixed(2)}M`;
            } else if (absMoney >= 1000) {
                moneyText = `负债 $${(absMoney / 1000).toFixed(2)}K`;
            } else {
                moneyText = `负债 $${absMoney.toLocaleString()}`;
            }
        } else {
            // 正数显示为资金
            if (money >= 1000000) {
                moneyText = `$${(money / 1000000).toFixed(2)}M`;
            } else if (money >= 1000) {
                moneyText = `$${(money / 1000).toFixed(2)}K`;
            } else {
                moneyText = `$${money.toLocaleString()}`;
            }
        }

        this.moneyEl.textContent = moneyText;

        // 颜色样式
        if (money < 0) {
            this.moneyEl.classList.add('negative');
        } else {
            this.moneyEl.classList.remove('negative');
        }

        if (animate) {
            this.moneyEl.classList.add('pulse');
            setTimeout(() => this.moneyEl.classList.remove('pulse'), GameConfig.NUMBER_ANIMATION_DURATION);
        }
    }

    // 更新时间和天数
    updateTime() {
        this.dayEl.textContent = `第 ${game.state.totalDays} 天`;
        this.timeEl.textContent = '自动推进';
    }

    // 更新家庭人数
    updateFamily() {
        this.familyEl.textContent = `${game.state.familySize} 人`;

        // 如果接近家庭上限，显示警告
        const maxFamily = GameConfig.MAX_FAMILY_SIZE;
        if (game.state.familySize >= maxFamily) {
            this.familyEl.style.color = '#ef4444';
        } else if (game.state.familySize >= maxFamily - 1) {
            this.familyEl.style.color = '#fbbf24';
        } else {
            this.familyEl.style.color = '#22d3ee';
        }
    }

    // 更新统计信息
    updateStats() {
        this.todayIncomeEl.textContent = `$${game.state.todayIncome.toLocaleString()}`;
        this.todayWorkEl.textContent = `$${game.state.todayWorkIncome.toLocaleString()} / $${GameConfig.DAILY_WORK_MAX.toLocaleString()}`;
        this.todayExpenseEl.textContent = `$${game.state.todayExpense.toLocaleString()}`;
    }

    // 更新按钮状态
    updateButtons() {
        const isGameOver = game.state.isGameOver;
        const canHaveChild = game.state.money >= GameConfig.CHILD_COST_TO_BEAR;
        const atMaxFamily = game.state.familySize >= GameConfig.MAX_FAMILY_SIZE;
        const workLimitReached = game.state.todayWorkIncome >= GameConfig.DAILY_WORK_MAX;

        this.btnWork.disabled = isGameOver || workLimitReached;
        this.btnGamble.disabled = isGameOver;
        this.btnChild.disabled = isGameOver;

        // 工作按钮视觉反馈
        if (!isGameOver && workLimitReached) {
            this.btnWork.style.opacity = '0.4';
            this.btnWork.querySelector('.btn-sub').textContent = '今日已达到上限';
        } else if (!isGameOver) {
            this.btnWork.style.opacity = '1';
            this.btnWork.querySelector('.btn-sub').textContent = `+ $${GameConfig.WORK_INCOME} / 次`;
        }

        // 生孩子按钮视觉反馈
        if (!isGameOver) {
            if (atMaxFamily) {
                this.btnChild.style.opacity = '0.4';
                this.btnChild.querySelector('.btn-sub').textContent = '已达上限';
            } else if (!canHaveChild) {
                this.btnChild.style.opacity = '0.6';
                this.btnChild.querySelector('.btn-sub').textContent = '资金不足';
            } else {
                this.btnChild.style.opacity = '1';
                this.btnChild.querySelector('.btn-sub').textContent = `-$${GameConfig.CHILD_COST_TO_BEAR} / +$${GameConfig.CHILD_COST}/天`;
            }
        }
    }

    // 显示消息
    showMessage(text, type = MessageType.INFO) {
        this.messageText.textContent = text;

        // 移除所有类型类
        this.messageText.classList.remove('success', 'error', 'warning', 'mandatory');

        // 添加对应类型类
        if (type !== MessageType.INFO) {
            this.messageText.classList.add(type);
        }

        // 清除之前的定时器
        if (this.messageTimer) {
            clearTimeout(this.messageTimer);
        }

        // 强制消息显示更长时间
        const duration = type === MessageType.MANDATORY ? 5000 : GameConfig.MESSAGE_DURATION;

        // 自动清除消息
        this.messageTimer = setTimeout(() => {
            this.messageText.textContent = '选择你的行动...';
            this.messageText.classList.remove('success', 'error', 'warning', 'mandatory');
        }, duration);
    }

    // 闪光效果
    flashEffect(type) {
        if (type === 'gamble') {
            document.body.style.background = 'linear-gradient(135deg, #06b6d4 0%, #0f172a 50%, #1e293b 100%)';
            setTimeout(() => {
                document.body.style.background = '';
            }, 500);
        } else if (type === 'fail') {
            document.body.style.background = 'linear-gradient(135deg, #ef4444 0%, #0f172a 50%, #1e293b 100%)';
            setTimeout(() => {
                document.body.style.background = '';
            }, 500);
        }
    }

    // 抖动效果
    shakeEffect() {
        const container = document.querySelector('.game-container');
        container.style.animation = 'shake 0.5s ease';

        // 添加抖动动画
        const style = document.createElement('style');
        style.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-10px); }
                75% { transform: translateX(10px); }
            }
        `;
        document.head.appendChild(style);

        setTimeout(() => {
            container.style.animation = '';
            document.head.removeChild(style);
        }, 500);
    }

    // 显示游戏结束界面
    showGameOver(type) {
        const info = game.getGameOverInfo(type);

        this.gameOverTitle.textContent = info.title;
        this.gameOverMessage.textContent = info.message;

        // 生成统计信息
        let statsHTML = '';
        info.stats.forEach(stat => {
            statsHTML += `
                <div class="stat-row">
                    <span>${stat.label}：</span>
                    <span>${stat.value}</span>
                </div>
            `;
        });
        this.gameOverStats.innerHTML = statsHTML;

        // 显示遮罩
        this.gameOverOverlay.classList.add('show');

        // 禁用按钮
        this.updateButtons();
    }

    // 重置 UI
    reset() {
        this.updateAll();
        this.showMessage('新游戏开始！', MessageType.INFO);
    }
}

// 初始化 UI 控制器
const ui = new UIController();

// 将 UI 控制器绑定到游戏实例
game.setUI(ui);
