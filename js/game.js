// 游戏状态管理
class GameState {
    constructor() {
        this.reset();
    }

    reset() {
        this.money = GameConfig.INITIAL_MONEY;
        this.day = 1;
        this.hour = 0;
        this.familySize = GameConfig.INITIAL_FAMILY_SIZE;
        this.todayIncome = 0;
        this.todayExpense = 0;
        this.todayWorkIncome = 0; // 今日打工收入
        this.gambleCount = 0;
        this.totalDays = 0;
        this.isGameOver = false;
        this.isGameStarted = false;
        this.lastAutoUpdate = Date.now();
        this.mandatoryChildIndex = 0; // 强制生孩子的索引
    }

    // 计算每日总支出
    getDailyExpense() {
        return GameConfig.BASE_DAILY_COST + (this.familySize - 1) * GameConfig.CHILD_COST;
    }

    // 检查是否需要强制生孩子
    needsMandatoryChild() {
        const days = this.totalDays;
        const targetDays = GameConfig.MANDATORY_CHILD_DAYS;

        // 检查是否有需要生孩子的日子
        while (this.mandatoryChildIndex < targetDays.length &&
               days >= targetDays[this.mandatoryChildIndex]) {
            return {
                required: true,
                day: targetDays[this.mandatoryChildIndex]
            };
        }

        return { required: false };
    }

    // 强制生孩子（自动执行）
    forceHaveChild() {
        // 直接生孩子，不扣钱（强制生育）
        if (this.familySize < GameConfig.MAX_FAMILY_SIZE) {
            this.familySize++;
            this.mandatoryChildIndex++;
            return true;
        }
        return false;
    }

    // 检查游戏是否应该结束
    checkGameOver() {
        // 负债超过最大限制
        if (this.money < -GameConfig.MAX_DEBT) {
            return GameOverType.LOSE_MAX_DEBT;
        }

        // 达到财富目标
        if (this.money >= GameConfig.WIN_MONEY) {
            return GameOverType.WIN;
        }

        // 存活60天
        if (this.totalDays >= GameConfig.WIN_DAYS) {
            return GameOverType.WIN_SURVIVE;
        }

        return null;
    }

    // 自动推进时间（现实1分钟=游戏1天）
    autoAdvanceTime() {
        const now = Date.now();
        const elapsed = now - this.lastAutoUpdate;
        const msPerGameDay = GameConfig.REAL_MINUTES_PER_GAME_DAY * 60 * 1000;

        // 计算过去了多少个游戏日
        const daysPassed = Math.floor(elapsed / msPerGameDay);

        if (daysPassed > 0) {
            // 更新最后更新时间
            this.lastAutoUpdate = now - (elapsed % msPerGameDay);

            // 推进天数
            return this.advanceDays(daysPassed);
        }

        return { bankrupt: false, daysAdvanced: 0 };
    }

    // 推进指定天数
    advanceDays(days) {
        let bankrupt = false;

        for (let i = 0; i < days; i++) {
            this.day++;
            this.totalDays++;

            // 扣除每日生活费
            const dailyCost = this.getDailyExpense();
            this.money -= dailyCost;
            this.todayExpense = dailyCost;

            // 检查强制生孩子
            const mandatory = this.needsMandatoryChild();
            if (mandatory.required) {
                this.forceHaveChild();
            }

            // 重置今日收入
            this.todayIncome = 0;
            this.todayWorkIncome = 0; // 重置今日打工收入
        }

        return { bankrupt: this.money < -GameConfig.MAX_DEBT, daysAdvanced: days };
    }
}

// 游戏核心逻辑
class Game {
    constructor() {
        this.state = new GameState();
        this.ui = null; // UI 控制器，稍后初始化
        this.autoUpdateTimer = null;

        // 从 localStorage 读取存档
        this.loadGame();
    }

    setUI(ui) {
        this.ui = ui;
        this.ui.updateAll();

        // 启动自动时间更新（现实1分钟=游戏1天）
        this.startAutoUpdate();
    }

    // 启动自动时间更新
    startAutoUpdate() {
        // 每秒检查一次是否需要推进时间
        this.autoUpdateTimer = setInterval(() => {
            if (!this.state.isGameOver) {
                this.processAutoTimeUpdate();
            }
        }, 1000);
    }

    // 处理自动时间更新
    processAutoTimeUpdate() {
        const result = this.state.autoAdvanceTime();

        if (result.daysAdvanced > 0) {
            // 检查是否有强制生孩子
            const mandatory = this.state.needsMandatoryChild();
            if (mandatory.required && this.state.familySize < GameConfig.MAX_FAMILY_SIZE) {
                this.state.forceHaveChild();
                this.ui.showMessage(`👶 第 ${mandatory.day} 天，强制生育！家庭增加至 ${this.state.familySize} 人`, MessageType.MANDATORY);
            }

            this.ui.updateTime();
            this.ui.updateFamily();
            this.ui.updateMoney();
            this.checkGameState();
        }
    }

    // 正常上班
    work() {
        if (this.state.isGameOver) return;

        // 检查今日打工收入是否达到上限
        if (this.state.todayWorkIncome >= GameConfig.DAILY_WORK_MAX) {
            this.ui.showMessage(`❌ 今日打工收入已达上限 $${GameConfig.DAILY_WORK_MAX}，请明天再来`, MessageType.WARNING);
            this.ui.shakeEffect();
            return;
        }

        const income = GameConfig.WORK_INCOME;

        // 计算本次打工后是否会超过上限
        const totalAfterWork = this.state.todayWorkIncome + income;
        let actualIncome = income;

        if (totalAfterWork > GameConfig.DAILY_WORK_MAX) {
            // 如果超过上限，只赚到上限部分
            actualIncome = GameConfig.DAILY_WORK_MAX - this.state.todayWorkIncome;
            this.state.money += actualIncome;
            this.state.todayIncome += actualIncome;
            this.state.todayWorkIncome = GameConfig.DAILY_WORK_MAX;
            this.ui.showMessage(`💼 正常上班 +$${actualIncome} (今日已达上限 $${GameConfig.DAILY_WORK_MAX})`, MessageType.WARNING);
        } else {
            // 未超过上限
            this.state.money += income;
            this.state.todayIncome += income;
            this.state.todayWorkIncome += income;
            this.ui.showMessage(`💼 正常上班 +$${income} 💼`, MessageType.SUCCESS);
        }

        this.ui.updateMoney(true);
        this.checkGameState();
        this.saveGame();
    }

    // 赌博
    gamble() {
        if (this.state.isGameOver) return;

        const cost = GameConfig.GAMBLE_COST;

        // 检查资金是否足够支付赌博费用
        // if (this.state.money < cost && this.state.money < 0) {
        //     // 如果已经负债，可以继续赌博
        //     // 不限制
        // } else if (this.state.money < cost) {
        //     this.ui.showMessage(`❌ 资金不足，赌博需要支付 $${cost} 入场费`, MessageType.ERROR);
        //     this.ui.shakeEffect();
        //     return;
        // }

        // 扣除赌博费用
        this.state.money -= cost;
        this.state.todayExpense += cost;

        const isWin = Math.random() < GameConfig.GAMBLE_WIN_CHANCE;
        this.state.gambleCount++;

        if (isWin) {
            const winAmount = GameConfig.GAMBLE_WIN_AMOUNT;
            this.state.money += winAmount;
            this.state.todayIncome += winAmount;
            const netProfit = winAmount - cost;
            this.ui.showMessage(`🎰 赌博获胜！+$${winAmount} (净赚 $${netProfit}) 🎉`, MessageType.SUCCESS);
            this.ui.flashEffect('gamble');
        } else {
            this.ui.showMessage(`💔 赌博失败... 损失 $${cost}`, MessageType.ERROR);
            this.ui.flashEffect('fail');
        }

        this.ui.updateMoney();
        this.checkGameState();
        this.saveGame();
    }

    // 生孩子
    haveChild() {
        if (this.state.isGameOver) return;

        const cost = GameConfig.CHILD_COST_TO_BEAR;

        // 检查家庭人数上限
        if (this.state.familySize >= GameConfig.MAX_FAMILY_SIZE) {
            this.ui.showMessage(`❌ 家庭已达上限 ${GameConfig.MAX_FAMILY_SIZE} 人，无法再生育`, MessageType.ERROR);
            this.ui.shakeEffect();
            return;
        }

        // if (this.state.money < cost) {
        //     this.ui.showMessage(`❌ 资金不足，生孩子需要 $${cost}`, MessageType.ERROR);
        //     this.ui.shakeEffect();
        //     return;
        // }

        this.state.money -= cost;
        this.state.todayExpense += cost;
        this.state.familySize++;
        this.state.mandatoryChildIndex++;

        this.ui.showMessage(`👶 恭喜！喜得贵子，家庭增加至 ${this.state.familySize} 人`, MessageType.SUCCESS);
        this.ui.updateMoney();
        this.ui.updateFamily();
        this.checkGameState();
        this.saveGame();
    }

    // 检查游戏状态
    checkGameState() {
        const result = this.state.checkGameOver();

        if (result) {
            this.state.isGameOver = true;
            this.ui.showGameOver(result);

            // 停止自动更新
            if (this.autoUpdateTimer) {
                clearInterval(this.autoUpdateTimer);
            }

            this.saveGame();
        } else {
            this.ui.updateButtons();
        }
    }

    // 重新开始
    restart() {
        this.state.reset();

        // 重新启动自动更新
        if (this.autoUpdateTimer) {
            clearInterval(this.autoUpdateTimer);
        }

        this.ui.reset();
        this.startAutoUpdate();
        this.saveGame();
        this.ui.showMessage('游戏已重新开始！', MessageType.INFO);
    }

    // 保存游戏到 localStorage
    saveGame() {
        try {
            const saveData = {
                money: this.state.money,
                day: this.state.day,
                hour: this.state.hour,
                familySize: this.state.familySize,
                todayIncome: this.state.todayIncome,
                todayWorkIncome: this.state.todayWorkIncome,
                todayExpense: this.state.todayExpense,
                gambleCount: this.state.gambleCount,
                totalDays: this.state.totalDays,
                isGameOver: this.state.isGameOver,
                mandatoryChildIndex: this.state.mandatoryChildIndex,
                lastAutoUpdate: this.state.lastAutoUpdate
            };
            localStorage.setItem('aiWorkerGame', JSON.stringify(saveData));
        } catch (e) {
            console.warn('无法保存游戏:', e);
        }
    }

    // 从 localStorage 读取游戏
    loadGame() {
        try {
            const saveData = localStorage.getItem('aiWorkerGame');
            if (saveData) {
                const data = JSON.parse(saveData);
                this.state.money = data.money;
                this.state.day = data.day;
                this.state.hour = data.hour;
                this.state.familySize = data.familySize;
                this.state.todayIncome = data.todayIncome;
                this.state.todayWorkIncome = data.todayWorkIncome || 0;
                this.state.todayExpense = data.todayExpense;
                this.state.gambleCount = data.gambleCount;
                this.state.totalDays = data.totalDays;
                this.state.isGameOver = data.isGameOver;
                this.state.mandatoryChildIndex = data.mandatoryChildIndex || 0;
                this.state.lastAutoUpdate = data.lastAutoUpdate || Date.now();
                this.state.isGameStarted = true;
            }
        } catch (e) {
            console.warn('无法读取存档:', e);
            this.state.reset();
        }
    }

    // 获取游戏结束信息
    getGameOverInfo(type) {
        switch (type) {
            case GameOverType.WIN:
                return {
                    title: '🎉 财富自由！',
                    message: '恭喜你达到了财富目标，成功实现了人生逆袭！',
                    stats: [
                        { label: '最终资金', value: `$${this.state.money.toLocaleString()}` },
                        { label: '存活天数', value: `${this.state.totalDays} 天` },
                        { label: '家庭规模', value: `${this.state.familySize} 人` },
                        { label: '赌博次数', value: `${this.state.gambleCount} 次` }
                    ]
                };
            case GameOverType.LOSE_MAX_DEBT:
                return {
                    title: '💀 债务压垮...',
                    message: `你背负了超过 $${(GameConfig.MAX_DEBT / 1000000).toFixed(1)}M 的债务，人生陷入绝境。`,
                    stats: [
                        { label: '存活天数', value: `${this.state.totalDays} 天` },
                        { label: '最终资金', value: `$${this.state.money.toLocaleString()}` },
                        { label: '家庭规模', value: `${this.state.familySize} 人` },
                        { label: '赌博次数', value: `${this.state.gambleCount} 次` }
                    ]
                };
            case GameOverType.WIN_SURVIVE:
                return {
                    title: '🏆 坚持就是胜利！',
                    message: '你成功存活了60天，虽然没有大富大贵，但也是一种人生！',
                    stats: [
                        { label: '最终资金', value: `$${this.state.money.toLocaleString()}` },
                        { label: '存活天数', value: `${this.state.totalDays} 天` },
                        { label: '家庭规模', value: `${this.state.familySize} 人` },
                        { label: '赌博次数', value: `${this.state.gambleCount} 次` }
                    ]
                };
            default:
                return {
                    title: '游戏结束',
                    message: '你的故事到此结束',
                    stats: []
                };
        }
    }
}

// 初始化游戏实例
const game = new Game();
