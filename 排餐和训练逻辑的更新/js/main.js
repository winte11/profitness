/* js/main.js - 全局事件绑定与程序初始化入口 */

// 将内部函数挂载到 window，供 HTML 中硬编码的 onclick 属性使用
window.deleteRecord = function(date) { TrainingModule.deleteDateRecord(date); };
window.regenerateSingleMeal = function(index) { MealHelpers.regenerateSingleMeal(index); };
window.regenerateSingleDish = function(mealIndex, dishIndex) { MealHelpers.regenerateSingleDish(mealIndex, dishIndex); };
window.adjustRest = function(sec) { ExecutorModule.adjustRest(sec); };

// 新增的智能引擎功能入口
window.swapExercise = function(index) { TrainingModule.swapExercise(index); };
window.jumpToSet = function(index) { ExecutorModule.jumpToSet(index); };
window.finishWarmup = function() { ExecutorModule.finishWarmup(); };

// DOM 加载完毕后，初始化所有模块绑定
document.addEventListener('DOMContentLoaded', () => {
    // 1. 初始化鉴权
    AuthModule.init();

    // 2. 绑定顶部导航切换
    document.getElementById('main-nav').addEventListener('click', (e) => {
        if (e.target.dataset.tab) UI.switchTab(e.target.dataset.tab);
    });

    // 3. 排餐系统相关事件
    document.getElementById('btn-generate-plan').addEventListener('click', () => PlannerModule.generate());
    document.getElementById('btn-show-tracker').addEventListener('click', () => MealHelpers.initTracker());
    document.getElementById('btn-show-canteen').addEventListener('click', () => MealHelpers.generateCanteen());
    document.getElementById('btn-add-snack').addEventListener('click', () => MealHelpers.addSnack());
    document.getElementById('btn-clear-tracker').addEventListener('click', () => MealHelpers.clearTracker());
    document.getElementById('btn-save-tracker').addEventListener('click', () => MealHelpers.saveTracker());
    document.getElementById('btn-regenerate-canteen').addEventListener('click', () => MealHelpers.generateCanteen());

    // 4. 训练系统相关事件
    document.getElementById('trainSplit').addEventListener('change', () => TrainingModule.updateDays());
    document.getElementById('btn-generate-training').addEventListener('click', () => TrainingModule.generate());

    document.getElementById('btn-start-exec').addEventListener('click', () => ExecutorModule.start());
    document.getElementById('btn-finish-set').addEventListener('click', () => ExecutorModule.handleMainAction());
    document.getElementById('btn-exit-exec').addEventListener('click', () => ExecutorModule.exit());
    document.getElementById('btn-undo-set').addEventListener('click', () => ExecutorModule.undoSet());

    document.getElementById('btn-clear-history').addEventListener('click', () => TrainingModule.clearAllHistory());
    document.getElementById('btn-copy-record').addEventListener('click', () => {
        navigator.clipboard.writeText(document.getElementById('record-content').innerText).then(()=>alert('复制成功！'));
    });

    // 5. 初始化状态恢复 (读取上次排餐数据)
    TrainingModule.updateDays();
    const savedPlan = StorageSvc.load('userMealPlan');
    if(savedPlan && savedPlan.plan && savedPlan.plan.length > 0) {
        AppState.planner.plan = savedPlan.plan;

        AppState.planner.goal = savedPlan.goal || 'cut';
        const goalSelect = document.getElementById('goal');
        if (goalSelect) goalSelect.value = AppState.planner.goal;

        AppState.planner.totalCal = savedPlan.plan.reduce((sum,m)=>sum+(m.carbs*4+m.protein*4+m.fat*9),0);
        AppState.planner.totalCarb = savedPlan.plan.reduce((sum,m)=>sum+m.carbs,0);
        AppState.planner.totalPro = savedPlan.plan.reduce((sum,m)=>sum+m.protein,0);
        AppState.planner.totalFat = savedPlan.plan.reduce((sum,m)=>sum+m.fat,0);
        UI.renderPlannerResult();
    }
});