/* js/modules/training.js - 训练计划生成与沉浸式执行器（状态机） */

// 1. 建立庞大的动作平替矩阵
const ExerciseDB = {
    '背部(垂直拉)': ['引体向上', '宽距高位下拉', 'V柄下拉', '对握下拉'],
    '背部(水平拉)': ['杠铃俯身划船', '哑铃单臂划船', '坐姿划船', 'T杠划船'],
    '背部(孤立)': ['直臂下压', '绳索面拉'],
    '胸部(中胸)': ['平板杠铃卧推', '平板哑铃卧推', '固定器械推胸'],
    '胸部(上胸)': ['上斜卧推', '上斜哑铃卧推', '上斜器械推胸'],
    '胸部(中缝)': ['蝴蝶机夹胸', '绳索夹胸', '哑铃飞鸟'],
    '肩前束': ['哑铃推举', '杠铃推举', '器械推举'],
    '肩中束': ['哑铃侧平举', '绳索侧平举', '单臂侧平举'],
    '肩后束': ['哑铃俯身飞鸟', '反向蝴蝶机', '绳索面拉'],
    '斜方肌': ['哑铃耸肩', '杠铃耸肩'],
    '大腿前侧': ['杠铃深蹲', '哑铃高脚杯深蹲', '器械腿举', '哈克深蹲'],
    '大腿后侧': ['罗马尼亚硬拉', '哑铃直腿硬拉', '腿弯举'],
    '臀部': ['杠铃臀推', '哑铃臀推', '单腿臀推'],
    '核心腹部': ['卷腹', '悬垂举腿', '俄罗斯挺身', '负重卷腹'],
    '肱二头肌': ['哑铃交替弯举', '杠铃弯举', '锤式弯举', '绳索弯举'],
    '肱三头肌': ['绳索下压', '哑铃颈后臂屈伸', '仰卧臂屈伸', '窄距卧推'],
    '🔥背部(强化宽度)': ['宽距高位下拉', '引体向上', '单臂哑铃划船', 'V柄下拉'],
    '🔥胸部(强化厚度)': ['双杠臂屈伸', '负重俯卧撑', '平板哑铃卧推'],
    '🔥胸部(强化下沿)': ['双杠臂屈伸', '下斜哑铃卧推', '高位绳索夹胸'],
    '🔥肩部(强化饱满度)': ['单臂绳索侧平举', '哑铃侧平举递减组', '器械侧平举'],
    '🔥肩部(强化宽度)': ['绳索Y字平举', '单臂绳索侧平举', '宽距哑铃侧平举'],
    '🔥腿臀(强化下肢)': ['保加利亚单腿蹲', '箭步蹲', '倒蹬机'],
    '🔥腿臀(强化线条)': ['保加利亚分腿蹲', '哑铃箭步走', '绳索后踢']
};

const TrainingModule = {
    updateDays() {
        const split = document.getElementById('trainSplit').value;
        const daySelect = document.getElementById('trainDay');
        if (split === '3day') daySelect.innerHTML = `<option value="day1">Day 1: 背 + 肩后束 + 肱二头</option><option value="day2">Day 2: 胸 + 肩前中束 + 肱三头</option><option value="day3">Day 3: 腿臀 + 腹部</option>`;
        else daySelect.innerHTML = `<option value="day1">Day 1: 背部 + 肱二头 (拉)</option><option value="day2">Day 2: 胸部 + 肱三头 (推)</option><option value="day3">Day 3: 腿臀 + 腹部 (下肢)</option><option value="day4">Day 4: 肩部整体轰炸 (前中后束)</option>`;
    },
    generate() {
        const split = document.getElementById('trainSplit').value;
        const day = document.getElementById('trainDay').value;
        const goal = document.getElementById('trainGoal').value;
        const target = document.getElementById('targetMuscle').value;

        AppState.training.repsStr = goal === 'bulk' ? '10-15次 (保留1-2次余力)' : '12-20次 (高次数力竭)';
        let plan = []; let title = '';
        if (split === '3day') {
            if(day==='day1'){ title="三分化 Day1:核心拉力链"; plan=[{part:'背部(垂直拉)',name:'引体向上',sets:3},{part:'背部(水平拉)',name:'杠铃俯身划船',sets:3},{part:'肩后束',name:'哑铃俯身飞鸟',sets:3},{part:'肱二头肌',name:'哑铃交替弯举',sets:3}]; if(target==='back') plan.splice(1,0,{part:'🔥背部(强化宽度)',name:'宽距高位下拉',sets:3}); }
            if(day==='day2'){ title="三分化 Day2:核心推力链"; plan=[{part:'胸部(中胸)',name:'平板杠铃卧推',sets:3},{part:'胸部(上胸)',name:'上斜卧推',sets:3},{part:'肩前束',name:'哑铃推举',sets:3},{part:'肱三头肌',name:'绳索下压',sets:3}]; if(target==='chest') plan.splice(2,0,{part:'🔥胸部(强化厚度)',name:'双杠臂屈伸',sets:3}); if(target==='shoulder') plan.push({part:'🔥肩部(强化饱满度)',name:'单臂绳索侧平举',sets:3}); }
            if(day==='day3'){ title="三分化 Day3:下肢与核心"; plan=[{part:'大腿前侧',name:'杠铃深蹲',sets:3},{part:'大腿后侧',name:'罗马尼亚硬拉',sets:3},{part:'臀部',name:'杠铃臀推',sets:3},{part:'核心腹部',name:'卷腹',sets:3}]; if(target==='legs') plan.splice(2,0,{part:'🔥腿臀(强化下肢)',name:'保加利亚单腿蹲',sets:3}); }
        } else {
            if(day==='day1'){ title="四分化 Day1:纯粹拉力"; plan=[{part:'背部(垂直拉)',name:'引体向上',sets:3},{part:'背部(水平拉)',name:'杠铃俯身划船',sets:3},{part:'背部(孤立)',name:'直臂下压',sets:3},{part:'肱二头肌',name:'杠铃弯举',sets:3}]; if(target==='back') plan.splice(2,0,{part:'🔥背部(强化宽度)',name:'单臂哑铃划船',sets:3}); }
            if(day==='day2'){ title="四分化 Day2:纯粹推力"; plan=[{part:'胸部(中胸)',name:'平板杠铃卧推',sets:3},{part:'胸部(上胸)',name:'上斜哑铃卧推',sets:3},{part:'胸部(中缝)',name:'蝴蝶机夹胸',sets:3},{part:'肱三头肌',name:'绳索下压',sets:3}]; if(target==='chest') plan.splice(2,0,{part:'🔥胸部(强化下沿)',name:'双杠臂屈伸',sets:3}); }
            if(day==='day3'){ title="四分化 Day3:下肢系统"; plan=[{part:'大腿前侧',name:'杠铃深蹲',sets:3},{part:'大腿后侧',name:'罗马尼亚硬拉',sets:3},{part:'臀部',name:'杠铃臀推',sets:3},{part:'核心腹部',name:'负重卷腹',sets:3}]; if(target==='legs') plan.splice(2,0,{part:'🔥腿臀(强化线条)',name:'保加利亚分腿蹲',sets:3}); }
            if(day==='day4'){ title="四分化 Day4:肩部3D轰炸"; plan=[{part:'肩前束',name:'哑铃推举',sets:3},{part:'肩中束',name:'哑铃侧平举',sets:3},{part:'肩后束',name:'反向蝴蝶机',sets:3},{part:'斜方肌',name:'哑铃耸肩',sets:3}]; if(target==='shoulder') plan.splice(2,0,{part:'🔥肩部(强化宽度)',name:'绳索Y字平举',sets:3}); }
        }
        AppState.training.title = title;
        AppState.training.currentPlan = plan.map(item => ({...item, setsNum: item.sets}));
        UI.renderTraining();
    },

    // 痛点1解决：智能换卡功能
    swapExercise(index) {
        const item = AppState.training.currentPlan[index];
        const pool = ExerciseDB[item.part] || [];
        if(pool.length <= 1) return alert('💡 该部位已是最佳解剖学动作，暂无推荐平替。');

        let newEx = pool[Math.floor(Math.random() * pool.length)];
        let attempts = 0;
        while(newEx === item.name && attempts < 5) {
            newEx = pool[Math.floor(Math.random() * pool.length)];
            attempts++;
        }
        item.name = newEx;
        UI.renderTraining();
    },

    syncSets(index, val) { if(AppState.training.currentPlan[index]) AppState.training.currentPlan[index].setsNum = Math.max(1, parseInt(val) || 3); },
    deleteDateRecord(date) {
        let history = StorageSvc.load('workoutHistory') || [];
        history = history.filter(item => item.date !== date);
        StorageSvc.save('workoutHistory', history);
        UI.renderHistoryStats();
    },
    clearAllHistory() {
        if(!confirm('确定清空所有历史训练记录吗？此操作无法撤销。')) return;
        StorageSvc.save('workoutHistory', []);
        UI.renderHistoryStats();
    }
};

let wakeLock = null;

const ExecutorModule = {
    async start() {
        if(!AppState.training.currentPlan.length) return alert('先生成训练计划！');
        let flatList = [];
        AppState.training.currentPlan.forEach((ex, idx) => {
            for(let i=1; i<=ex.setsNum; i++) flatList.push({ id: `${idx}-${i}`, name: ex.name, part: ex.part, setNum: i, isCompleted: false, weight: 0, reps: 0 });
        });
        AppState.exec = { isActive: true, currentGlobalSetIndex: 0, totalSets: flatList.length, timer: null, elapsedSeconds: 0, flatSetList: flatList, restSeconds: 60, restTimer: null, isResting: false, restRemaining: 0 };

        document.getElementById('plan-generator-area').classList.add('hidden');
        document.getElementById('executor-area').classList.remove('hidden');
        document.getElementById('workout-record').classList.add('hidden');
        document.getElementById('exec-workout-state').classList.remove('hidden');

        try { if ('wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); } } catch (err) {}

        // 初始化第一个动作的动态休息时间
        if (flatList.length > 0) {
            document.getElementById('exec-rest-input').value = this.getDefaultRest(flatList[0].name);
        }

        this.startMainTimer();
        UI.renderExecutor();
    },

    // 痛点2解决：能量系统动态休息分配
    getDefaultRest(exerciseName) {
        const compounds = ['深蹲', '硬拉', '卧推', '划船', '引体', '臀推', '腿举', '推举'];
        if (compounds.some(c => exerciseName.includes(c))) return 120; // 复合大重量 120秒起步
        return 60; // 孤立小肌肉 60秒即可
    },

    startMainTimer() { AppState.exec.timer = setInterval(() => { AppState.exec.elapsedSeconds++; UI.updateExecTime(); }, 1000); },
    startRestTimer() {
        AppState.exec.restSeconds = parseInt(document.getElementById('exec-rest-input').value) || 60;
        AppState.exec.restRemaining = AppState.exec.restSeconds; AppState.exec.isResting = true;
        UI.renderExecutor();
        AppState.exec.restTimer = setInterval(() => {
            AppState.exec.restRemaining--;
            UI.updateRestTime();
            if(AppState.exec.restRemaining <= 0) this.endRest();
        }, 1000);
    },
    endRest() { clearInterval(AppState.exec.restTimer); AppState.exec.isResting = false; UI.renderExecutor(); },

    adjustRest(seconds) {
        if (!AppState.exec.isResting) return;
        AppState.exec.restRemaining += seconds;
        if (AppState.exec.restRemaining < 0) AppState.exec.restRemaining = 0;
        UI.updateRestTime();
    },

    handleMainAction() {
        if (AppState.exec.isResting) {
            this.endRest();
        } else {
            this.finishSet();
        }
    },

    finishSet() {
        if (AppState.exec.currentGlobalSetIndex >= AppState.exec.totalSets) return this.finalize();

        const curr = AppState.exec.flatSetList[AppState.exec.currentGlobalSetIndex];
        curr.weight = parseFloat(document.getElementById('exec-weight-input').value) || 0;
        curr.reps = parseInt(document.getElementById('exec-reps-input').value) || 0;
        curr.isCompleted = true;

        AppState.training.history.push({ exercise: curr.name, part: curr.part, weight: curr.weight, reps: curr.reps, date: new Date().toLocaleDateString() });

        // 痛点4配合：寻找下一个未完成的组
        AppState.exec.currentGlobalSetIndex++;
        while(AppState.exec.currentGlobalSetIndex < AppState.exec.totalSets && AppState.exec.flatSetList[AppState.exec.currentGlobalSetIndex].isCompleted) {
            AppState.exec.currentGlobalSetIndex++;
        }

        if(AppState.exec.currentGlobalSetIndex < AppState.exec.totalSets) {
            const nextCurr = AppState.exec.flatSetList[AppState.exec.currentGlobalSetIndex];
            if (curr.name !== nextCurr.name) {
                document.getElementById('exec-rest-input').value = this.getDefaultRest(nextCurr.name);
            }
            this.startRestTimer();
        } else {
            this.finalize();
        }
        UI.renderExecutor();
    },

    // 痛点3解决：热身组保护机制（不计入成绩，只给休息时间）
    finishWarmup() {
        if (AppState.exec.isResting) return;
        document.getElementById('exec-rest-input').value = 60; // 热身组恢复快，固定60秒
        this.startRestTimer();
    },

    // 痛点4解决：跳跃打卡
    jumpToSet(index) {
        if (index < 0 || index >= AppState.exec.totalSets) return;
        if (AppState.exec.flatSetList[index].isCompleted) return; // 已完成的不允许跳过去

        if (AppState.exec.isResting) this.endRest();
        AppState.exec.currentGlobalSetIndex = index;

        const curr = AppState.exec.flatSetList[index];
        document.getElementById('exec-rest-input').value = this.getDefaultRest(curr.name);

        UI.renderExecutor();
    },

    undoSet() {
        // 退回逻辑也需优化，寻找上一个已完成的组
        let prevIndex = AppState.exec.currentGlobalSetIndex - 1;
        while(prevIndex >= 0 && !AppState.exec.flatSetList[prevIndex].isCompleted) {
            prevIndex--;
        }
        if (prevIndex < 0) return;

        if (AppState.exec.isResting) { clearInterval(AppState.exec.restTimer); AppState.exec.isResting = false; }

        AppState.exec.currentGlobalSetIndex = prevIndex;
        AppState.exec.flatSetList[prevIndex].isCompleted = false;
        AppState.training.history.pop();
        UI.renderExecutor();
    },

    // 痛点5解决：渐进超负荷追踪器
    getSuggestedData(exerciseName) {
        const sessionSets = AppState.exec.flatSetList.filter(s => s.name === exerciseName && s.isCompleted);
        if (sessionSets.length > 0) {
            const last = sessionSets[sessionSets.length - 1];
            return { weight: last.weight, reps: last.reps, hint: `💡 维持本节重量继续做` };
        }
        const history = StorageSvc.load('workoutHistory') || [];
        const related = history.filter(item => item.exercise === exerciseName);
        if (related.length > 0) {
            const last = related[related.length - 1];
            let w = last.weight || 0;
            let r = last.reps || 12;
            let hint = `💡 上次记录: ${w}kg x ${r}次`;

            // 智能超负荷算法
            if (w > 0) {
                if (r >= 12) {
                    w += 2.5;
                    hint = `🏆 上次已做满${r}次，建议加重至 ${w}kg 挑战！`;
                } else if (r < 8) {
                    w = Math.max(0, w - 2.5);
                    hint = `📉 上次仅${r}次，建议降重至 ${w}kg 找发力感。`;
                }
            }
            return { weight: w, reps: r, hint: hint };
        }
        return { weight: 0, reps: 12, hint: '💡 暂无历史数据，请先用轻重量热身' };
    },

    finalize() {
        clearInterval(AppState.exec.timer); clearInterval(AppState.exec.restTimer);
        if (wakeLock !== null) { wakeLock.release().then(() => { wakeLock = null; }); }

        const oldHistory = StorageSvc.load('workoutHistory') || [];
        StorageSvc.save('workoutHistory', [...oldHistory, ...AppState.training.history]);
        UI.renderWorkoutRecord();
        UI.renderHistoryStats();
        document.getElementById('exec-workout-state').classList.add('hidden');
        document.getElementById('workout-record').classList.remove('hidden');
    },
exit() {
        // 增加二次确认弹窗保护机制
        if (!confirm('⚠️ 当前训练尚未完成，直接退出将不会保存刚才的打卡记录。\n\n确定要提前结束训练吗？')) {
            return; // 用户点击取消，继续保持训练状态
        }

        clearInterval(AppState.exec.timer); clearInterval(AppState.exec.restTimer);
        if (wakeLock !== null) { wakeLock.release().then(() => { wakeLock = null; }); }
        document.getElementById('executor-area').classList.add('hidden');
        document.getElementById('plan-generator-area').classList.remove('hidden');
    }
};