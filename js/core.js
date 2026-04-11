/* js/core.js - 全局状态、本地存储、鉴权与 UI 渲染库 */

const AppState = {
    deviceId: "",
    planner: {
        goal: 'cut', gender: 'male', activity: '1.2', weight: null, height: null, age: null, workoutTime: 'evening_after',
        plan: [], totalCal: 0, totalCarb: 0, totalPro: 0, totalFat: 0
    },
    tracker: { data: [] },
    canteen: { meals: [] },
    training: {
        split: '3day', day: 'day1', goal: 'bulk', target: 'none', currentPlan: [], title: '', repsStr: '',
        history: []
    },
    exec: {
        isActive: false, currentGlobalSetIndex: 0, totalSets: 0, timer: null, elapsedSeconds: 0,
        flatSetList: [], restSeconds: 60, restTimer: null, isResting: false, restRemaining: 0
    }
};

const StorageSvc = {
    save(key, data) { try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {} },
    load(key) { try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : null; } catch (e) { return null; } }
};

const AuthModule = {
    API_URL: "https://tsnfy1bkmw.sealosbja.site/verifyCode",
    init: function() {
        if (localStorage.getItem('xf_pro_activated') === 'true') {
            document.getElementById('activation-overlay').style.display = 'none';
            return;
        }
        FingerprintJS.load().then(fp => fp.get()).then(result => {
            AppState.deviceId = result.visitorId;
        }).catch(() => {
            AppState.deviceId = localStorage.getItem('xf_fallback_id') || "fb-" + Math.random().toString(36).substring(2);
            localStorage.setItem('xf_fallback_id', AppState.deviceId);
        });
        document.getElementById('btn-activate').addEventListener('click', () => this.verify());
    },
    verify: function() {
        const btn = document.getElementById('btn-activate');
        const err = document.getElementById('activation-error');
        const code = document.getElementById('activation-code-input').value.trim();

        if (!code) { err.innerText = "请输入激活码"; err.classList.remove('hidden'); return; }

        btn.innerText = "校验中..."; btn.disabled = true; err.classList.add('hidden');

        fetch(this.API_URL, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: code, deviceId: AppState.deviceId })
        })
        .then(res => res.json())
        .then(data => {
            if (data.code === 200) {
                localStorage.setItem('xf_pro_activated', 'true');
                alert("🎉 解锁成功！欢迎使用 PRO 版");
                document.getElementById('activation-overlay').style.opacity = '0';
                setTimeout(() => { document.getElementById('activation-overlay').style.display = 'none'; }, 500);
            } else { err.innerText = data.msg; err.classList.remove('hidden'); }
        })
        .catch(() => { err.innerText = "连接服务器失败，请稍后重试"; err.classList.remove('hidden'); })
        .finally(() => { btn.innerText = "立即绑定并解锁"; btn.disabled = false; });
    }
};

const UI = {
    switchTab(tabId) {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('nav-active'));

        document.getElementById('sec-' + tabId).classList.remove('hidden');
        document.querySelector(`[data-tab="${tabId}"]`).classList.add('nav-active');

        if(tabId === 'training') { TrainingModule.updateDays(); this.renderHistoryStats(); }
        if(tabId === 'food') this.renderFoodDB();
        if(tabId === 'learn') this.renderArticles();
    },

    renderPlannerResult() {
        const state = AppState.planner;
        document.getElementById('res-cal').innerText = state.totalCal;
        document.getElementById('res-carb').innerText = state.totalCarb;
        document.getElementById('res-pro').innerText = state.totalPro;
        document.getElementById('res-fat').innerText = state.totalFat;

        const tbody = document.getElementById('meal-plan-body');
        tbody.innerHTML = '';
        state.plan.forEach(m => {
            tbody.innerHTML += `<tr><td class="font-bold text-gray-800 whitespace-nowrap">${m.name}</td><td class="text-blue-600 font-bold bg-blue-50/30">${m.carbs}</td><td class="text-green-600 font-bold bg-green-50/30">${m.protein}</td><td class="text-yellow-600 font-bold bg-yellow-50/30">${m.fat}</td></tr>`;
        });

        document.getElementById('custom-tracker-container').classList.add('hidden');
        document.getElementById('canteen-meal-container').classList.add('hidden');
        document.getElementById('result-section').classList.remove('hidden');
        document.getElementById('canteen-buttons-container').classList.remove('hidden');
    },

    renderTracker() {
        const tbody = document.getElementById('tracker-tbody'); tbody.innerHTML = '';
        let tc=0, ac=0, tp=0, ap=0, tf=0, af=0;

        AppState.tracker.data.forEach((m, i) => {
            tc+=m.carbs; ac+=m.actualCarbs; tp+=m.protein; ap+=m.actualProtein; tf+=m.fat; af+=m.actualFat;
            const diff = Math.round((m.actualCarbs*4+m.actualProtein*4+m.actualFat*9) - (m.carbs*4+m.protein*4+m.fat*9));
            const rate = (m.carbs+m.protein+m.fat)===0 ? 1 : (m.actualCarbs+m.actualProtein+m.actualFat)/(m.carbs+m.protein+m.fat);
            const statusClass = rate >= 0.9 ? 'text-green-600 font-bold' : rate < 0.7 ? 'text-red-600 font-bold' : 'text-yellow-600 font-bold';
            const status = rate >= 0.9 ? '✅ 达标' : rate < 0.7 ? '⚠️ 未达标' : '⏳ 进行中';

            tbody.innerHTML += `<tr><td class="font-bold text-gray-800 whitespace-nowrap">${m.name}</td><td>${m.carbs}</td>
            <td><input type="number" class="sets-input" value="${m.actualCarbs}" onchange="MealHelpers.updateTracker(${i}, 'actualCarbs', this.value)"></td>
            <td>${m.protein}</td><td><input type="number" class="sets-input" value="${m.actualProtein}" onchange="MealHelpers.updateTracker(${i}, 'actualProtein', this.value)"></td>
            <td>${m.fat}</td><td><input type="number" class="sets-input" value="${m.actualFat}" onchange="MealHelpers.updateTracker(${i}, 'actualFat', this.value)"></td>
            <td class="font-bold ${diff>=0?'text-green-600':'text-red-600'}">${diff>0?'+':''}${diff}</td><td class="${statusClass} whitespace-nowrap">${status}</td></tr>`;
        });

        const tdiff = Math.round((ac*4+ap*4+af*9) - (tc*4+tp*4+tf*9));
        const trate = (tc+tp+tf) === 0 ? 1 : (ac+ap+af)/(tc+tp+tf);
        document.getElementById('tracker-tfoot').innerHTML = `<tr class="bg-gray-50 font-bold"><td class="text-gray-900 whitespace-nowrap">当日汇总</td><td class="text-blue-600">${tc}</td><td class="text-blue-600">${Math.round(ac*10)/10}</td><td class="text-green-600">${tp}</td><td class="text-green-600">${Math.round(ap*10)/10}</td><td class="text-yellow-600">${tf}</td><td class="text-yellow-600">${Math.round(af*10)/10}</td><td class="${tdiff>=0?'text-green-600':'text-red-600'}">${tdiff>0?'+':''}${tdiff}</td><td class="text-purple-600 whitespace-nowrap">${Math.round(trate*100)}% 完成率</td></tr>`;
        document.getElementById('custom-tracker-container').classList.remove('hidden');
        document.getElementById('canteen-meal-container').classList.add('hidden');
    },

    renderCanteen() {
        const listContainer = document.getElementById('canteen-meal-list'); listContainer.innerHTML = '';
        const summaryContainer = document.getElementById('canteen-meal-summary');

        let totalTarget = { carbs: 0, protein: 0, fat: 0, calories: 0 };
        let totalActual = { carbs: 0, protein: 0, fat: 0, calories: 0 };

        AppState.canteen.meals.forEach(meal => {
            totalTarget.carbs += meal.target.carbs; totalTarget.protein += meal.target.protein; totalTarget.fat += meal.target.fat;
            totalTarget.calories += meal.target.carbs * 4 + meal.target.protein * 4 + meal.target.fat * 9;
            totalActual.carbs += meal.actual.carbs; totalActual.protein += meal.actual.protein; totalActual.fat += meal.actual.fat; totalActual.calories += meal.actual.calories;
        });

        const carbRate = 1 - Math.abs(totalActual.carbs - totalTarget.carbs) / Math.max(totalTarget.carbs, 1);
        const proteinRate = 1 - Math.abs(totalActual.protein - totalTarget.protein) / Math.max(totalTarget.protein, 1);
        const fatRate = 1 - Math.abs(totalActual.fat - totalTarget.fat) / Math.max(totalTarget.fat, 1);
        const totalRate = Math.round((carbRate + proteinRate + fatRate) / 3 * 100);
        const goalNameMap = { 'cut': '严格减脂', 'recomp': '塑形线条', 'bulk': '干净增肌' };
        const goal = AppState.planner.goal;

        summaryContainer.innerHTML = `
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <span class="badge ${goal === 'cut' ? 'badge-red' : goal === 'recomp' ? 'badge-purple' : 'badge-green'} mb-2">适配目标：${goalNameMap[goal]}</span>
                    <h4 class="text-lg font-bold text-gray-900">今日食堂餐单总览</h4>
                </div>
                <div class="text-right">
                    <p class="text-sm text-gray-500">总宏量达标率</p>
                    <p class="text-3xl font-black ${totalRate >= 85 ? 'text-green-600' : totalRate >= 70 ? 'text-yellow-600' : 'text-red-600'}">${totalRate}%</p>
                </div>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-200">
                <div class="text-center"><p class="text-xs text-gray-500 uppercase tracking-wider font-bold">总热量</p><p class="text-lg font-bold text-gray-900">${Math.round(totalActual.calories)} <span class="text-xs text-gray-400">/ ${totalTarget.calories} kcal</span></p></div>
                <div class="text-center"><p class="text-xs text-gray-500 uppercase tracking-wider font-bold">碳水</p><p class="text-lg font-bold text-blue-600">${Math.round(totalActual.carbs*10)/10} <span class="text-xs text-gray-400">/ ${totalTarget.carbs} g</span></p></div>
                <div class="text-center"><p class="text-xs text-gray-500 uppercase tracking-wider font-bold">蛋白</p><p class="text-lg font-bold text-green-600">${Math.round(totalActual.protein*10)/10} <span class="text-xs text-gray-400">/ ${totalTarget.protein} g</span></p></div>
                <div class="text-center"><p class="text-xs text-gray-500 uppercase tracking-wider font-bold">脂肪</p><p class="text-lg font-bold text-yellow-600">${Math.round(totalActual.fat*10)/10} <span class="text-xs text-gray-400">/ ${totalTarget.fat} g</span></p></div>
            </div>
        `;

        AppState.canteen.meals.forEach((meal, index) => {
            listContainer.innerHTML += `
            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div class="flex justify-between items-start mb-3 pb-2 border-b border-gray-200">
                    <div class="flex items-center">
                        <h5 class="font-bold text-gray-900 text-lg">${meal.name}</h5>
                        <button onclick="window.regenerateSingleMeal(${index})" class="ml-3 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold py-1 px-2 rounded transition duration-200 text-xs whitespace-nowrap">🔄 换一整餐</button>
                    </div>
                    <div class="text-right text-xs hidden md:block">
                        <p class="text-gray-500">目标宏量</p>
                        <p class="font-medium">碳${meal.target.carbs}g · 蛋${meal.target.protein}g · 脂${meal.target.fat}g</p>
                    </div>
                </div>
                <div class="space-y-2">
                    ${meal.dishes.map((dish, dIdx) => `
                        <div class="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-100">
                            <div>
                                <p class="font-bold text-gray-800 flex items-center">
                                    ${dish.name}
                                    <button onclick="window.regenerateSingleDish(${index}, ${dIdx})" class="ml-2 text-gray-400 hover:text-blue-600 transition-colors" title="换一换此菜">🔄</button>
                                </p>
                                <p class="text-xs text-gray-500">${dish.category} · ${dish.weight}g</p>
                            </div>
                            <div class="text-right text-xs"><p class="text-gray-600">${Math.round(dish.calories)} kcal</p><p class="text-gray-400">碳${Math.round(dish.carbs*10)/10}g · 蛋${Math.round(dish.protein*10)/10}g · 脂${Math.round(dish.fat*10)/10}g</p></div>
                        </div>
                    `).join('')}
                </div>
                <div class="mt-3 pt-3 border-t border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center text-sm gap-2">
                    <div>
                        <span class="text-gray-500">本餐实际：</span>
                        <span class="font-bold text-blue-600">碳${Math.round(meal.actual.carbs*10)/10}g</span> · <span class="font-bold text-green-600">蛋${Math.round(meal.actual.protein*10)/10}g</span> · <span class="font-bold text-yellow-600">脂${Math.round(meal.actual.fat*10)/10}g</span> · <span class="font-bold text-gray-700">${Math.round(meal.actual.calories)}kcal</span>
                    </div>
                    <div class="text-right w-full md:w-auto">
                        <span class="text-gray-500">差值：</span>
                        <span class="${meal.diff.calories >= 0 ? 'text-green-600' : 'text-red-600'} font-bold">${meal.diff.calories >= 0 ? '+' : ''}${meal.diff.calories}kcal</span>
                        <span class="text-xs text-green-600 font-bold ml-1">${meal.diff.msg || ''}</span>
                    </div>
                </div>
            </div>`;
        });
        document.getElementById('canteen-meal-container').classList.remove('hidden');
        document.getElementById('custom-tracker-container').classList.add('hidden');
    },

    renderTraining() {
        document.getElementById('train-title-display').innerText = AppState.training.title;
        document.getElementById('train-reps-display').innerText = AppState.training.repsStr;
        const tbody = document.getElementById('training-plan-body'); tbody.innerHTML = '';
        AppState.training.currentPlan.forEach((item, i) => {
            const isT = item.part.includes('🔥');
            // 痛点1强化：加入了“换一换器械”按钮
            tbody.innerHTML += `<tr>
                <td class="${isT?'text-red-600':'text-gray-800'} font-bold">${item.part}</td>
                <td class="${isT?'text-gray-900':'text-gray-600'} flex items-center justify-center">
                    ${item.name}
                    <button onclick="window.swapExercise(${i})" class="ml-2 text-gray-400 hover:text-blue-600 transition-colors" title="换平替器械">🔄</button>
                </td>
                <td><input type="number" class="sets-input" value="${item.setsNum}" onchange="TrainingModule.syncSets(${i}, this.value)"></td>
                <td class="text-xs text-gray-400 hidden md:table-cell">${AppState.training.repsStr}</td>
            </tr>`;
        });
        document.getElementById('training-result-section').classList.remove('hidden');
        document.getElementById('history-section').classList.remove('hidden');
    },

    renderExecutor() {
        const s = AppState.exec;
        document.getElementById('exec-progress-bar').style.width = `${Math.min((s.currentGlobalSetIndex/s.totalSets)*100, 100)}%`;
        document.getElementById('exec-set-counter').innerText = `${s.currentGlobalSetIndex}/${s.totalSets}`;
        document.getElementById('exec-progress-text').innerText = s.currentGlobalSetIndex >= s.totalSets ? '全部完成' : `进行中: ${s.flatSetList[s.currentGlobalSetIndex]?.part}`;

        const undoBtn = document.getElementById('btn-undo-set');
        if (s.currentGlobalSetIndex > 0) undoBtn.classList.remove('hidden');
        else undoBtn.classList.add('hidden');

        const btn = document.getElementById('btn-finish-set');

        // 痛点3强化：无损注入【热身组按钮】
        let warmupBtn = document.getElementById('btn-warmup-set');
        if (!warmupBtn) {
            warmupBtn = document.createElement('button');
            warmupBtn.id = 'btn-warmup-set';
            warmupBtn.className = 'exec-btn bg-orange-50 text-orange-600 hover:bg-orange-100 flex-1 text-sm border border-orange-200 font-bold';
            warmupBtn.innerHTML = '🔥 记为热身';
            warmupBtn.onclick = () => window.finishWarmup();
            btn.parentNode.insertBefore(warmupBtn, btn);
        }

        if (s.isResting) {
            document.getElementById('rest-timer-box').classList.remove('hidden');
            btn.className = 'exec-btn exec-btn-rest flex-[2]'; btn.innerHTML = `<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>跳过休息`;
            warmupBtn.classList.add('hidden');
        } else {
            document.getElementById('rest-timer-box').classList.add('hidden');
            warmupBtn.classList.remove('hidden');
            const curr = s.flatSetList[s.currentGlobalSetIndex];
            if(curr) {
                document.getElementById('exec-current-exercise').value = curr.name;

                // 痛点5强化：渐进超负荷追踪与 UI 变色
                const sugg = ExecutorModule.getSuggestedData(curr.name);
                document.getElementById('exec-weight-input').value = sugg.weight;
                document.getElementById('exec-reps-input').value = sugg.reps;
                const hintEl = document.getElementById('exec-history-hint');
                hintEl.innerText = sugg.hint;
                if (sugg.hint.includes('🏆')) hintEl.className = 'text-center text-xs font-bold text-green-600 mt-2 h-4';
                else if (sugg.hint.includes('📉')) hintEl.className = 'text-center text-xs font-bold text-yellow-600 mt-2 h-4';
                else hintEl.className = 'text-center text-xs font-bold text-blue-500 mt-2 h-4';
            }
            btn.className = 'exec-btn exec-btn-success flex-[2]'; btn.innerHTML = s.currentGlobalSetIndex >= s.totalSets ? '查看记录' : `✅ 完成正式组`;
        }

        const container = document.getElementById('set-list-container'); container.innerHTML = '';
        let lastPart = '';
        s.flatSetList.forEach((item, index) => {
            if(item.part !== lastPart) {
                container.innerHTML += `<div class="px-4 py-2 bg-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">${item.part}</div>`;
                lastPart = item.part;
            }
            // 痛点4强化：加入 onclick 跳转事件
            container.innerHTML += `<div id="set-item-${index}" onclick="window.jumpToSet(${index})" class="set-item ${!item.isCompleted ? 'cursor-pointer hover:bg-gray-50' : ''} ${item.isCompleted ? 'completed' : ''} ${index === s.currentGlobalSetIndex && !item.isCompleted && !s.isResting ? 'active' : ''}">
                <div class="flex items-center gap-3"><div class="check-circle">${item.isCompleted ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>' : ''}</div><div><p class="font-bold text-gray-900 set-text">${item.name}</p><p class="text-xs text-gray-500">第 ${item.setNum} 组</p></div></div>
                ${item.isCompleted && item.weight > 0 ? `<span class="text-sm font-bold text-gray-400">${item.weight}kg x ${item.reps}次</span>` : ''}
            </div>`;
        });

        const activeEl = document.getElementById(`set-item-${s.currentGlobalSetIndex}`);
        if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    updateExecTime() { document.getElementById('timer-display').innerText = `${String(Math.floor(AppState.exec.elapsedSeconds/60)).padStart(2,'0')}:${String(AppState.exec.elapsedSeconds%60).padStart(2,'0')}`; },
    updateRestTime() { document.getElementById('rest-display').innerText = `${String(Math.floor(AppState.exec.restRemaining/60)).padStart(2,'0')}:${String(AppState.exec.restRemaining%60).padStart(2,'0')}`; },

    renderWorkoutRecord() {
        const container = document.getElementById('record-content'); container.innerHTML = '';
        const title = AppState.training.title || '训练记录';
        const duration = document.getElementById('timer-display').innerText;
        container.innerHTML = `<p class="text-center font-bold text-lg">${title}</p><p class="text-center text-sm text-gray-500 mb-4">总时长: ${duration}</p>`;

        const todayRecords = AppState.training.history.filter(item=>item.date === new Date().toLocaleDateString());
        const displayMap = {};
        todayRecords.forEach(r => {
            if(!displayMap[r.exercise]) displayMap[r.exercise] = { sets: 0, maxW: 0, maxReps: 0 };
            displayMap[r.exercise].sets++;
            if(r.weight >= displayMap[r.exercise].maxW) {
                displayMap[r.exercise].maxW = r.weight;
                displayMap[r.exercise].maxReps = r.reps || 0;
            }
        });
        for(const [name, data] of Object.entries(displayMap)) container.innerHTML += `<div class="p-3 bg-gray-50 rounded flex justify-between"><span class="font-medium text-gray-800">${name}</span><span class="text-gray-500 font-bold">${data.sets}组 / 极限 ${data.maxW}kg x ${data.maxReps}次</span></div>`;
    },

    renderHistoryStats() {
        const history = StorageSvc.load('workoutHistory') || [];
        const stats = {};
        history.forEach(item => {
            const part = item.part.replace('🔥','').replace(/\(.*\)/,'').trim();
            stats[part] = (stats[part] || 0) + 1;
        });

        const statsContainer = document.getElementById('monthly-stats');
        let html = `
            <div class="mb-5">
                <h4 class="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center">
                    <svg class="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
                    本月肌群容量监控
                </h4>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        `;

        Object.entries(AppDB.muscleStats).forEach(([part, cfg]) => {
            const current = stats[part] || 0;
            let level = '标准'; let statusColor = 'text-green-500'; let barColor = 'bg-green-500'; let pct = (current / cfg.max) * 100;
            if (current < cfg.min) { level = '不足'; statusColor = 'text-yellow-500'; barColor = 'bg-yellow-400'; pct = (current / cfg.min) * 100; }
            else if (current > cfg.max) { level = '超量'; statusColor = 'text-red-500'; barColor = 'bg-red-500'; pct = 100; }
            html += `
                <div class="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                    <p class="text-xs font-bold text-gray-400 mb-1">${part}</p>
                    <div class="flex items-baseline gap-1 mb-2"><span class="text-2xl font-black text-gray-800 leading-none">${current}</span><span class="text-xs font-medium text-gray-400">组</span></div>
                    <div class="w-full bg-gray-100 rounded-full h-1.5 mb-2 overflow-hidden"><div class="${barColor} h-1.5 rounded-full transition-all duration-500" style="width: ${Math.min(pct, 100)}%"></div></div>
                    <div class="flex justify-between items-center text-[0.65rem] font-bold"><span class="text-gray-400">${cfg.min}-${cfg.max}组</span><span class="${statusColor}">${level}</span></div>
                </div>
            `;
        });
        html += `</div></div>`;
        statsContainer.innerHTML = html;

        const listContainer = document.getElementById('history-list');
        listContainer.innerHTML = `<div class="flex items-center justify-between mb-4 mt-8"><h4 class="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center"><svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0121 12z"></path></svg>详细训练日志</h4></div>`;
        const listWrapper = document.createElement('div'); listWrapper.className = 'space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar';
        const grouped = {}; history.forEach(item => { if(!grouped[item.date]) grouped[item.date] = []; grouped[item.date].push(item); });

        if(Object.keys(grouped).length === 0) { listWrapper.innerHTML = '<div class="text-center py-8 text-gray-400 text-sm">暂无训练记录</div>'; }
        else {
            Object.keys(grouped).reverse().forEach(date => {
                const records = grouped[date]; const div = document.createElement('div');
                div.className = 'group bg-white border border-gray-100 p-4 rounded-xl shadow-sm transition-all flex justify-between items-center';
                let d = new Date(date); let dayStr = isNaN(d.getTime()) ? date.slice(-2) + '日' : d.getDate() + '日';
                div.innerHTML = `
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">${dayStr}</div>
                        <div><p class="font-bold text-gray-900 text-sm">${date}</p><p class="text-xs text-gray-500 font-medium mt-0.5">共 <span class="text-blue-600 font-bold">${records.length}</span> 组</p></div>
                    </div>
                    <button class="md:opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-2 rounded-lg hover:bg-red-50" onclick="window.deleteRecord('${date}')" title="删除记录"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                `;
                listWrapper.appendChild(div);
            });
        }
        listContainer.appendChild(listWrapper);
    },

    renderFoodDB() {
        const container = document.getElementById('visual-db-grid'); if(container.innerHTML !== '') return;
        const iconMap = { '主食类': '🍚', '大荤硬菜类': '🥩', '荤素搭配类': '🥘', '素菜国民类': '🥬', '特色档口类': '🍜', '高蛋白小食': '🥚', '中式早餐类': '🥟', '水果快充类': '🍎', '练后补剂类': '🥤' };
        const zones = [
            {title:'🌅 晨间唤醒 (早八人专属)', colorText:'text-orange-600', colorBorder:'border-orange-200', cats:['中式早餐类']},
            {title:'🍱 食堂正餐 (午晚吃饱)', colorText:'text-blue-600', colorBorder:'border-blue-200', cats:['大荤硬菜类', '荤素搭配类', '素菜国民类', '特色档口类', '主食类']},
            {title:'⚡ 练后快充与加餐', colorText:'text-green-600', colorBorder:'border-green-200', cats:['水果快充类', '练后补剂类', '高蛋白小食']}
        ];
        zones.forEach(z => {
            const foods = AppDB.canteenFoods.filter(f => z.cats.includes(f.category));
            if(!foods.length) return;
            let html = `<div class="animation-fade-in"><h3 class="text-xl font-black ${z.colorText} mb-5 flex items-center border-b ${z.colorBorder} pb-2">${z.title}</h3><div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">`;
            foods.forEach(f => {
                const icon = iconMap[f.category] || '🍽️';
                const total = f.carbs + f.protein + f.fat || 1;
                html += `<div class="border border-gray-100 rounded-2xl p-5 bg-white hover:shadow-lg transition-all relative overflow-hidden group flex flex-col justify-between h-full">
                    <div>
                        <div class="flex justify-between items-start mb-3">
                            <div><span class="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md mb-2 inline-block">${icon} ${f.category}</span><h3 class="font-bold text-gray-900 text-lg">${f.name}</h3></div>
                            <div class="text-right bg-blue-50 px-2 py-1 rounded-lg"><span class="text-base font-black text-blue-700">${f.calories}</span><span class="text-[10px] text-blue-400 block -mt-1">kcal/${f.weight}g</span></div>
                        </div>
                        <div class="w-full h-1.5 flex rounded-full overflow-hidden mb-2 mt-4 bg-gray-100"><div style="width:${(f.carbs/total)*100}%" class="bg-blue-400"></div><div style="width:${(f.protein/total)*100}%" class="bg-green-400"></div><div style="width:${(f.fat/total)*100}%" class="bg-yellow-400"></div></div>
                        <div class="flex justify-between text-xs font-bold text-gray-600 mb-4"><span class="text-blue-600">碳水 ${f.carbs}g</span><span class="text-green-600">蛋白 ${f.protein}g</span><span class="text-yellow-600">脂肪 ${f.fat}g</span></div>
                    </div>
                    <div class="text-xs text-gray-500 bg-gray-50/80 border border-gray-100 p-2.5 rounded-lg leading-relaxed mt-auto">💡 ${f.tips}</div>
                </div>`;
            });
            container.innerHTML += html + `</div></div>`;
        });
    },

    renderArticles() {
        const nav = document.getElementById('article-nav-container'); const content = document.getElementById('article-content-container');
        if(nav.innerHTML !== '') return;
        AppDB.articles.forEach((a, i) => {
            const btn = document.createElement('button'); btn.className = `article-btn ${i===0?'article-active':''}`;
            btn.innerHTML = `<span class="badge ${a.badge} mr-2">${a.module}</span>${a.title}`;
            btn.onclick = () => { document.querySelectorAll('.article-btn').forEach(b=>b.classList.remove('article-active')); btn.classList.add('article-active'); content.innerHTML = `<div class="border-b border-gray-100 pb-4 mb-4"><h2 class="text-xl font-bold text-gray-900">${a.title}</h2><p class="text-xs text-gray-500 mt-2">阅读时长：${a.readTime}</p></div><div class="content-box">${a.content}</div>`; };
            nav.appendChild(btn);
        });
        if(AppDB.articles.length > 0) content.innerHTML = `<div class="border-b border-gray-100 pb-4 mb-4"><h2 class="text-xl font-bold text-gray-900">${AppDB.articles[0].title}</h2><p class="text-xs text-gray-500 mt-2">阅读时长：${AppDB.articles[0].readTime}</p></div><div class="content-box">${AppDB.articles[0].content}</div>`;
    }
};