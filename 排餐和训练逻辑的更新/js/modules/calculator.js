/* js/modules/calculator.js */
/* 依赖全局对象: AppState, AppDB, StorageSvc, UI */

const PlannerModule = {
    generate() {
        const weight = parseFloat(document.getElementById('weight').value);
        const height = parseFloat(document.getElementById('height').value);
        const age = parseFloat(document.getElementById('age').value);
        if (!weight || !height || !age) { alert('⚠️ 请先填写完整的体重、身高和年龄信息！'); return; }

        const goal = document.getElementById('goal').value;
        const gender = document.getElementById('gender').value;
        const activity = parseFloat(document.getElementById('activity').value);
        const workoutTime = document.getElementById('workoutTime').value;

        let bmr = (gender === 'male') ? (10 * weight) + (6.25 * height) - (5 * age) + 5 : (10 * weight) + (6.25 * height) - (5 * age) - 161;
        let tdee = bmr * activity;
        let targetCal, protein, fat, carbs;

        if (goal === 'cut') { targetCal = tdee - 500; protein = weight * 2.0; fat = weight * 0.8; }
        else if (goal === 'recomp') { targetCal = tdee - 300; protein = weight * 1.8; fat = weight * 0.9; }
        else { targetCal = tdee + 300; protein = weight * 1.6; fat = weight * 1.0; }
        carbs = Math.max((targetCal - (protein * 4) - (fat * 9)) / 4, 50);

        AppState.planner = { goal, gender, activity, weight, height, age, workoutTime, totalCal: Math.round(targetCal), totalCarb: Math.round(carbs), totalPro: Math.round(protein), totalFat: Math.round(fat), plan: [] };

        let meals = [];
        if (workoutTime === 'morning') meals = [ { name: '🔥 早饭 (练前餐)', r: [0.3, 0.2, 0.3] }, { name: '🔥 练后加餐', r: [0.15, 0.2, 0] }, { name: '午饭', r: [0.35, 0.3, 0.35] }, { name: '晚饭', r: [0.2, 0.3, 0.35] } ];
        else if (workoutTime === 'noon_before') meals = [ { name: '早饭', r: [0.25, 0.3, 0.35] }, { name: '🔥 午饭 (练前餐)', r: [0.25, 0.2, 0.25] }, { name: '🔥 练后加餐/午加', r: [0.15, 0.2, 0] }, { name: '晚饭', r: [0.35, 0.3, 0.4] } ];
        else if (workoutTime === 'noon_after') meals = [ { name: '早饭', r: [0.25, 0.25, 0.35] }, { name: '🔥 午饭 (练前充碳)', r: [0.3, 0.2, 0.25] }, { name: '🔥 练后正餐 (下午)', r: [0.3, 0.3, 0.1] }, { name: '晚饭', r: [0.15, 0.25, 0.3] } ];
        else if (workoutTime === 'evening_before') meals = [ { name: '早饭', r: [0.25, 0.25, 0.35] }, { name: '午饭', r: [0.3, 0.25, 0.35] }, { name: '🔥 练前加餐', r: [0.15, 0.1, 0] }, { name: '🔥 晚饭 (练后餐)', r: [0.3, 0.4, 0.3] } ];
        else if (workoutTime === 'evening_after') meals = [ { name: '早饭', r: [0.25, 0.25, 0.33] }, { name: '午饭', r: [0.35, 0.3, 0.33] }, { name: '🔥 晚饭 (练前餐)', r: [0.25, 0.25, 0.34] }, { name: '🔥 练后加餐', r: [0.15, 0.2, 0] } ];
        else if (workoutTime === 'night') meals = [ { name: '早饭', r: [0.25, 0.25, 0.33] }, { name: '午饭', r: [0.3, 0.3, 0.33] }, { name: '🔥 晚饭 (练前储备)', r: [0.35, 0.25, 0.34] }, { name: '🔥 练后夜宵', r: [0.1, 0.2, 0] } ];
        else meals = [ { name: '早饭 (常规)', r: [0.3, 0.3, 0.33] }, { name: '午饭 (常规)', r: [0.4, 0.4, 0.33] }, { name: '晚饭 (常规)', r: [0.3, 0.3, 0.34] } ];

        AppState.planner.plan = meals.map(meal => ({ name: meal.name, carbs: Math.round(carbs * meal.r[0]), protein: Math.round(protein * meal.r[1]), fat: Math.round(fat * meal.r[2]) }));
        StorageSvc.save('userMealPlan', { plan: AppState.planner.plan, goal: AppState.planner.goal });

        UI.renderPlannerResult();
    }
};

const MealHelpers = {
    initTracker() {
        if (!AppState.planner.plan.length) return alert('⚠️ 请先生成方案！');
        const today = new Date().toLocaleDateString();
        const saved = StorageSvc.load('trackerData');
        if (saved && saved.date === today) AppState.tracker.data = saved.data;
        else AppState.tracker.data = AppState.planner.plan.map(m => ({...m, actualCarbs: 0, actualProtein: 0, actualFat: 0}));
        UI.renderTracker();
    },
    updateTracker(index, field, value) { AppState.tracker.data[index][field] = parseFloat(value) || 0; UI.renderTracker(); },
    addSnack() { AppState.tracker.data.push({ name: '🍪 加餐', carbs: 0, protein: 0, fat: 0, actualCarbs: 0, actualProtein: 0, actualFat: 0 }); UI.renderTracker(); },
    clearTracker() { if (confirm('确定要清空今日打卡数据吗？')) { AppState.tracker.data = AppState.tracker.data.map(m => ({...m, actualCarbs: 0, actualProtein: 0, actualFat: 0})); UI.renderTracker(); } },
    saveTracker() { StorageSvc.save('trackerData', { date: new Date().toLocaleDateString(), data: AppState.tracker.data }); alert('💾 今日打卡数据已保存！'); },

    _getFilteredDishes(goal) {
        return AppDB.canteenFoods.filter(dish => {
            if (dish.goals && dish.goals.includes('none')) return false;
            if (goal === 'cut') return dish.fat <= 20 && !dish.tips?.includes('减脂期慎选') && !dish.tips?.includes('减脂期别碰') && !dish.tips?.includes('减脂期禁用');
            if (goal === 'recomp') return dish.fat <= 30 && !dish.tips?.includes('减脂期别碰');
            return true;
        });
    },

    generateCanteen() {
        if (!AppState.planner.plan.length) return alert('⚠️ 请先在上方填写体重信息并点击“生成数据化方案”！');
        let filteredDishes = this._getFilteredDishes(AppState.planner.goal);

        AppState.canteen.meals = AppState.planner.plan.map(mealTarget => {
            return this._smartMatchMeal(mealTarget, filteredDishes);
        });
        UI.renderCanteen();
    },

    regenerateSingleMeal(index) {
        if (!AppState.planner.plan.length) return;
        let filteredDishes = this._getFilteredDishes(AppState.planner.goal);
        const mealTarget = AppState.planner.plan[index];
        AppState.canteen.meals[index] = this._smartMatchMeal(mealTarget, filteredDishes);
        UI.renderCanteen();
    },

    _smartMatchMeal(mealTarget, dishes) {
        let meal = { name: mealTarget.name, target: mealTarget, dishes: [], actual: { carbs: 0, protein: 0, fat: 0, calories: 0 } };
        const isBreakfast = mealTarget.name.includes('早饭');
        const isSnack = mealTarget.name.includes('加餐') || mealTarget.name.includes('夜宵');

        const addDish = (dish, requestedPortion = 1) => {
            if(!dish) return;
            let actualPortion = requestedPortion;
            let displayName = dish.name;

            // 判断是否是主食属性（无论什么分类，只要是充当碳水的）
            const isStaple = dish.category === '主食类' ||
                             (dish.category === '中式早餐类' && !dish.name.includes('豆浆') && !dish.name.includes('牛奶') && !dish.name.includes('蛋')) ||
                             dish.category === '水果快充类';

            if (isStaple) {
                if (requestedPortion <= 0.7) actualPortion = 0.5;
                else if (requestedPortion <= 1.3) actualPortion = 1.0;
                else if (requestedPortion <= 1.7) actualPortion = 1.5;
                else actualPortion = 2.0;

                if (actualPortion === 0.5) displayName += ' (半份/小碗)';
                else if (actualPortion === 1.0) displayName += ' (1份/正常碗)';
                else if (actualPortion === 1.5) displayName += ' (1份半/多打点)';
                else displayName += ' (2份/大碗)';
            } else if (dish.category === '素菜国民类' || dish.category === '大荤硬菜类' || dish.category === '荤素搭配类') {
                actualPortion = 1.0;
                displayName += ' (1勺/份)';
            } else {
                actualPortion = 1.0; // 液体或单独补剂，不做份数修饰
            }

            let adjusted = {
                ...dish,
                name: displayName,
                weight: Math.round(dish.weight * actualPortion),
                carbs: Math.round(dish.carbs * actualPortion),
                protein: Math.round(dish.protein * actualPortion * 10) / 10,
                fat: Math.round(dish.fat * actualPortion * 10) / 10,
                calories: Math.round(dish.calories * actualPortion),
                rawCategory: dish.category
            };
            meal.dishes.push(adjusted);
            meal.actual.carbs += adjusted.carbs;
            meal.actual.protein += adjusted.protein;
            meal.actual.fat += adjusted.fat;
            meal.actual.calories += adjusted.calories;
        };

        const getRand = (cats, filterFn = null) => {
            let pool = dishes.filter(d => cats.includes(d.category));
            if (filterFn) pool = pool.filter(filterFn);
            return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
        };

        // 1. 中国胃早晨模板 (防智障抽取机制)
        if (isBreakfast) {
            // 严格抽取流食
            let liquid = getRand(['中式早餐类', '高蛋白小食'], d => d.name.includes('豆浆') || d.name.includes('牛奶') || d.name.includes('粥'));
            addDish(liquid, 1);

            // 严格抽取鸡蛋（防皮蛋瘦肉粥冒充鸡蛋）
            let egg = getRand(['高蛋白小食', '中式早餐类'], d => d.name.includes('水煮蛋') || d.name.includes('茶叶蛋') || d.name.includes('纯蛋清'));
            if (mealTarget.protein - meal.actual.protein > 5) {
                addDish(egg, 1);
            }

            // 剩下的碳水缺口，全部由固体主食来补齐（严格排除米饭和炒菜）
            let solid = getRand(['中式早餐类', '主食类'], d =>
                !d.name.includes('豆浆') && !d.name.includes('牛奶') && !d.name.includes('粥') &&
                !d.name.includes('米饭') && !d.name.includes('面条') && !d.name.includes('炒') && !d.name.includes('馄饨')
            );
            let remainingCarbs = mealTarget.carbs - meal.actual.carbs;
            let solidRatio = solid ? (remainingCarbs / Math.max(solid.carbs, 1)) : 1;
            if (solidRatio < 0.5) solidRatio = 0.5; // 保底得吃半份
            addDish(solid, solidRatio);

        // 2. 加餐/练前练后模板 (快碳 + 优质蛋白)
        } else if (isSnack) {
            let fastCarb = getRand(['水果快充类', '主食类', '中式早餐类'], d =>
                d.category === '水果快充类' || d.name.includes('面包') || d.name.includes('燕麦') || d.name.includes('红薯') || d.name.includes('玉米')
            );
            let fastProtein = getRand(['练后补剂类', '高蛋白小食']);

            addDish(fastCarb, 1);
            if (fastProtein && (mealTarget.protein - meal.actual.protein > 5)) {
                addDish(fastProtein, 1);
            }

        // 3. 食堂午晚正餐模板 (先选菜，再看缺口配饭)
        } else {
            if (Math.random() < 0.25) {
                let allInOne = getRand(['特色档口类']);
                if (allInOne) {
                    addDish(allInOne, 1);
                    if (mealTarget.protein - meal.actual.protein > 10) {
                        addDish(getRand(['高蛋白小食', '大荤硬菜类'], d => !d.name.includes('炒') && !d.name.includes('面')), 1);
                    }
                }
            }

            if (meal.dishes.length === 0) {
                let meat = getRand(['大荤硬菜类']);
                let mixedOrVeg = getRand(['荤素搭配类', '素菜国民类']);

                // 先打菜
                addDish(meat, 1);
                addDish(mixedOrVeg, 1);

                // 根据菜品占掉的碳水，再去算需要打几勺米饭
                let remainingCarbs = mealTarget.carbs - meal.actual.carbs;
                let staple = getRand(['主食类']);
                let stapleRatio = staple ? (remainingCarbs / Math.max(staple.carbs, 1)) : 1;
                if (stapleRatio <= 0.3) stapleRatio = 0.5; // 饭再少也得来半勺

                addDish(staple, stapleRatio);
            }
        }

        let diffCal = Math.round(meal.actual.calories - (mealTarget.carbs * 4 + mealTarget.protein * 4 + mealTarget.fat * 9));
        let toleranceMsg = Math.abs(diffCal) <= 150 ? ' (在合理误差内，完美！)' : '';
        meal.diff = { calories: diffCal, msg: toleranceMsg };
        return meal;
    },

    regenerateSingleDish(mealIndex, dishIndex) {
        if (!AppState.planner.plan.length) return;
        const meal = AppState.canteen.meals[mealIndex];
        const oldDish = meal.dishes[dishIndex];
        let filteredDishes = this._getFilteredDishes(AppState.planner.goal);

        // 保证在同分类中抽，且名字不重复
        let pool = filteredDishes.filter(d => d.category === oldDish.rawCategory && !oldDish.name.includes(d.name));

        // 【关键防御】如果是在早餐里换菜，必须重新附上严格的过滤网！
        if (meal.name.includes('早饭')) {
             if (oldDish.name.includes('粥') || oldDish.name.includes('豆浆') || oldDish.name.includes('牛奶')) {
                 pool = pool.filter(d => d.name.includes('豆浆') || d.name.includes('牛奶') || d.name.includes('粥'));
             } else if (oldDish.name.includes('蛋')) {
                 pool = pool.filter(d => d.name.includes('水煮蛋') || d.name.includes('茶叶蛋') || d.name.includes('纯蛋清'));
             } else {
                 pool = pool.filter(d => !d.name.includes('豆浆') && !d.name.includes('牛奶') && !d.name.includes('粥') && !d.name.includes('米饭') && !d.name.includes('面条') && !d.name.includes('炒') && !d.name.includes('蛋') && !d.name.includes('馄饨'));
             }
        }

        if(pool.length === 0) pool = filteredDishes.filter(d => d.category === oldDish.rawCategory);
        if(pool.length === 0) return;

        let newDishRaw = pool[Math.floor(Math.random() * pool.length)];

        let actualPortion = 1;
        let portionText = ' (1勺/份)';

        const isStaple = newDishRaw.category === '主食类' ||
                         (newDishRaw.category === '中式早餐类' && !newDishRaw.name.includes('豆浆') && !newDishRaw.name.includes('牛奶') && !newDishRaw.name.includes('蛋')) ||
                         newDishRaw.category === '水果快充类';

        // 【核心修复】智能等量代换：不再死板继承旧份数，而是根据旧菜的碳水含量，算出新菜需要几份！
        if (isStaple) {
            let rawRatio = oldDish.carbs / Math.max(newDishRaw.carbs, 1);
            if (rawRatio <= 0.7) { actualPortion = 0.5; portionText = ' (半份/小碗)'; }
            else if (rawRatio <= 1.3) { actualPortion = 1.0; portionText = ' (1份/正常碗)'; }
            else if (rawRatio <= 1.7) { actualPortion = 1.5; portionText = ' (1份半/多打点)'; }
            else { actualPortion = 2.0; portionText = ' (2份/大碗)'; }
        } else if (newDishRaw.category === '素菜国民类' || newDishRaw.category === '大荤硬菜类' || newDishRaw.category === '荤素搭配类') {
            actualPortion = 1.0;
            portionText = ' (1勺/份)';
        } else {
            actualPortion = 1.0;
            portionText = '';
        }

        let adjusted = {
            ...newDishRaw,
            name: newDishRaw.name + portionText,
            weight: Math.round(newDishRaw.weight * actualPortion),
            carbs: Math.round(newDishRaw.carbs * actualPortion),
            protein: Math.round(newDishRaw.protein * actualPortion * 10) / 10,
            fat: Math.round(newDishRaw.fat * actualPortion * 10) / 10,
            calories: Math.round(newDishRaw.calories * actualPortion),
            rawCategory: oldDish.rawCategory
        };

        // 卸载旧菜，装载新菜
        meal.actual.carbs -= oldDish.carbs;
        meal.actual.protein -= oldDish.protein;
        meal.actual.fat -= oldDish.fat;
        meal.actual.calories -= oldDish.calories;

        meal.dishes[dishIndex] = adjusted;

        meal.actual.carbs += adjusted.carbs;
        meal.actual.protein += adjusted.protein;
        meal.actual.fat += adjusted.fat;
        meal.actual.calories += adjusted.calories;

        let diffCal = Math.round(meal.actual.calories - (meal.target.carbs * 4 + meal.target.protein * 4 + meal.target.fat * 9));
        meal.diff = { calories: diffCal, msg: Math.abs(diffCal) <= 150 ? ' (在合理误差内，完美！)' : '' };

        UI.renderCanteen();
    }
};