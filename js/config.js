// 游戏配置参数
const GameConfig = {
    // 时间系统：现实 1 分钟 = 游戏 1 天
    REAL_MINUTES_PER_GAME_DAY: 1,
    GAME_HOURS_PER_DAY: 24,

    // 经济参数
    INITIAL_MONEY: 0,
    WORK_INCOME: 73,           // 正常上班每小时收入
    DAILY_WORK_MAX: 600,       // 每日打工收入上限
    GAMBLE_COST: 150,          // 赌博入场费
    GAMBLE_WIN_AMOUNT: 1000,   // 赌博获胜金额
    GAMBLE_WIN_CHANCE: 0.015,  // 赌博获胜概率 1.5%
    GAMBLE_LOSS_AMOUNT: 0,     // 赌博失败损失

    // 负债系统
    MAX_DEBT: 1000000,         // 最大负债金额
    BANKRUPT_THRESHOLD: -1000000, // 破产阈值（负债超过此值）

    // 家庭参数
    BASE_DAILY_COST: 50,       // 基础每日生活费
    CHILD_COST: 30,            // 每个孩子每天支出
    CHILD_COST_TO_BEAR: 7300,  // 生孩子的成本
    INITIAL_FAMILY_SIZE: 1,    // 初始家庭人数（只有自己）

    // 强制生孩子
    MANDATORY_CHILD_DAYS: [10, 20, 30, 40, 50], // 到达这些天数必须生孩子
    MAX_FAMILY_SIZE: 6,        // 最大家庭人数

    // 游戏目标
    WIN_MONEY: 1000000,        // 胜利目标金额
    WIN_DAYS: 60,              // 存活60天也算胜利

    // 动画时长（毫秒）
    MESSAGE_DURATION: 3000,
    NUMBER_ANIMATION_DURATION: 500
};

// 消息类型
const MessageType = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    MANDATORY: 'mandatory'
};

// 游戏结束类型
const GameOverType = {
    WIN: 'win',
    WIN_SURVIVE: 'win_survive',
    LOSE_MAX_DEBT: 'lose_max_debt'
};
