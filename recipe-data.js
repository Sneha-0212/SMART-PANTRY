/**
 * ============================================================================
 * SMART PANTRY - RECIPE DATA (Recipe Suggestions module)
 *
 * This file only holds DATA. It has no DOM code and no matching logic.
 *
 *   RecipeData.recipes        -> the recipe catalogue (replace/extend freely)
 *   RecipeData.mockInventory  -> DEMO ONLY pantry used when no shared
 *                                inventory exists yet. It is read through
 *                                recipe-inventory-adapter.js and is never the
 *                                real inventory.
 *
 * Recipe shape
 *   {
 *     id, name, emoji,
 *     image,            // optional: "images/recipes/xyz.jpg". If empty or the
 *                       // file fails to load, an illustrated tile is shown.
 *     category,         // Breakfast | Lunch | Dinner | Snack | Dessert
 *     prepMinutes, cookMinutes, difficulty ("Easy" | "Medium" | "Hard"),
 *     servings,
 *     ingredients: [{ name, quantity, unit, optional? }],
 *     steps: [string]
 *   }
 *
 * Ingredients such as salt, oil and basic spices are treated as pantry staples
 * (see STAPLES in recipe-engine.js). They are still listed in the recipe, but
 * they do not count against the match percentage.
 * ============================================================================
 */
(function (root) {
  'use strict';

  // --------------------------------------------------------------------------
  // RECIPES
  // --------------------------------------------------------------------------
  const recipes = [
    {
      id: 'tomato-onion-omelette',
      name: 'Tomato Onion Omelette',
      emoji: '🍳',
      image: '',
      category: 'Breakfast',
      prepMinutes: 5,
      cookMinutes: 8,
      difficulty: 'Easy',
      servings: 2,
      ingredients: [
        { name: 'Eggs', quantity: 3, unit: 'pcs' },
        { name: 'Onion', quantity: 1, unit: 'medium' },
        { name: 'Tomato', quantity: 1, unit: 'medium' },
        { name: 'Green chilli', quantity: 1, unit: 'pc', optional: true },
        { name: 'Coriander leaves', quantity: 2, unit: 'tbsp', optional: true },
        { name: 'Oil', quantity: 1, unit: 'tbsp' },
        { name: 'Salt', quantity: '', unit: 'to taste' }
      ],
      steps: [
        'Finely chop the onion, tomato, chilli and coriander.',
        'Crack the eggs into a bowl, add salt and whisk until frothy.',
        'Heat the oil in a non-stick pan and soften the onion for 2 minutes.',
        'Add the tomato and cook for 1 minute, then pour in the eggs.',
        'Cook on medium heat until the edges set, fold the omelette in half and cook 1 more minute.'
      ]
    },
    {
      id: 'spinach-cheese-frittata',
      name: 'Spinach and Cheese Frittata',
      emoji: '🥬',
      image: '',
      category: 'Breakfast',
      prepMinutes: 10,
      cookMinutes: 15,
      difficulty: 'Easy',
      servings: 3,
      ingredients: [
        { name: 'Eggs', quantity: 4, unit: 'pcs' },
        { name: 'Spinach', quantity: 100, unit: 'g' },
        { name: 'Onion', quantity: 1, unit: 'small' },
        { name: 'Cheese', quantity: 50, unit: 'g, grated' },
        { name: 'Milk', quantity: 2, unit: 'tbsp' },
        { name: 'Oil', quantity: 1, unit: 'tbsp' },
        { name: 'Salt', quantity: '', unit: 'to taste' },
        { name: 'Black pepper', quantity: '', unit: 'to taste' }
      ],
      steps: [
        'Wash the spinach and roughly chop it. Slice the onion thinly.',
        'Whisk the eggs with milk, half the cheese, salt and pepper.',
        'Heat the oil in an oven-safe pan. Cook the onion for 3 minutes, then wilt the spinach for 1 to 2 minutes.',
        'Pour the egg mixture over the vegetables and scatter the remaining cheese on top.',
        'Cook on low heat for 6 minutes until the base sets, then grill or bake at 180°C for 5 minutes until golden.'
      ]
    },
    {
      id: 'palak-paneer',
      name: 'Palak Paneer',
      emoji: '🍛',
      image: '',
      category: 'Dinner',
      prepMinutes: 15,
      cookMinutes: 25,
      difficulty: 'Medium',
      servings: 3,
      ingredients: [
        { name: 'Spinach', quantity: 250, unit: 'g' },
        { name: 'Paneer', quantity: 200, unit: 'g, cubed' },
        { name: 'Onion', quantity: 1, unit: 'medium' },
        { name: 'Tomato', quantity: 2, unit: 'medium' },
        { name: 'Garlic', quantity: 3, unit: 'cloves' },
        { name: 'Ginger', quantity: 1, unit: 'inch piece', optional: true },
        { name: 'Cream', quantity: 2, unit: 'tbsp', optional: true },
        { name: 'Oil', quantity: 1, unit: 'tbsp' },
        { name: 'Cumin seeds', quantity: 1, unit: 'tsp' },
        { name: 'Garam masala', quantity: 1, unit: 'tsp' },
        { name: 'Salt', quantity: '', unit: 'to taste' }
      ],
      steps: [
        'Blanch the spinach in boiling water for 2 minutes, drain, cool in cold water and blend to a smooth puree.',
        'Heat the oil and add the cumin seeds. When they sizzle, add chopped onion, garlic and ginger and cook until golden.',
        'Add the chopped tomatoes and cook until soft and the oil separates, about 6 minutes.',
        'Stir in the spinach puree, garam masala and salt. Simmer for 5 minutes.',
        'Add the paneer cubes and cream, and cook gently for 3 minutes. Serve hot with roti or rice.'
      ]
    },
    {
      id: 'aloo-tamatar-curry',
      name: 'Aloo Tamatar Curry',
      emoji: '🥔',
      image: '',
      category: 'Dinner',
      prepMinutes: 10,
      cookMinutes: 25,
      difficulty: 'Easy',
      servings: 3,
      ingredients: [
        { name: 'Potatoes', quantity: 3, unit: 'medium' },
        { name: 'Tomato', quantity: 2, unit: 'medium' },
        { name: 'Onion', quantity: 1, unit: 'medium' },
        { name: 'Coriander leaves', quantity: 2, unit: 'tbsp', optional: true },
        { name: 'Oil', quantity: 2, unit: 'tbsp' },
        { name: 'Cumin seeds', quantity: 1, unit: 'tsp' },
        { name: 'Turmeric powder', quantity: 0.5, unit: 'tsp' },
        { name: 'Red chilli powder', quantity: 1, unit: 'tsp' },
        { name: 'Salt', quantity: '', unit: 'to taste' }
      ],
      steps: [
        'Peel the potatoes and cut them into 2 cm cubes. Chop the onion and tomatoes.',
        'Heat the oil, add the cumin seeds and let them sizzle. Add the onion and cook until light brown.',
        'Add the tomatoes with turmeric, chilli powder and salt. Cook until they turn mushy.',
        'Add the potatoes and 1 cup of water. Cover and cook for 15 minutes, stirring occasionally, until tender.',
        'Garnish with coriander and serve with chapati or steamed rice.'
      ]
    },
    {
      id: 'spanish-potato-tortilla',
      name: 'Spanish Potato Tortilla',
      emoji: '🥘',
      image: '',
      category: 'Lunch',
      prepMinutes: 15,
      cookMinutes: 25,
      difficulty: 'Medium',
      servings: 4,
      ingredients: [
        { name: 'Potatoes', quantity: 3, unit: 'medium' },
        { name: 'Eggs', quantity: 5, unit: 'pcs' },
        { name: 'Onion', quantity: 1, unit: 'medium' },
        { name: 'Olive oil', quantity: 4, unit: 'tbsp' },
        { name: 'Salt', quantity: '', unit: 'to taste' }
      ],
      steps: [
        'Peel the potatoes and slice them thinly. Slice the onion.',
        'Heat the olive oil in a 20 cm non-stick pan on medium-low. Cook the potatoes and onion with a pinch of salt for 15 minutes until tender but not browned.',
        'Beat the eggs with salt in a large bowl. Drain the potatoes and fold them into the eggs. Let sit for 5 minutes.',
        'Return the mixture to the pan and cook on low for 5 minutes until the edges set.',
        'Flip using a plate and cook the other side for 3 minutes. Rest for 5 minutes, then slice into wedges.'
      ]
    },
    {
      id: 'tomato-rice',
      name: 'Tangy Tomato Rice',
      emoji: '🍅',
      image: '',
      category: 'Lunch',
      prepMinutes: 10,
      cookMinutes: 20,
      difficulty: 'Easy',
      servings: 2,
      ingredients: [
        { name: 'Rice', quantity: 1, unit: 'cup' },
        { name: 'Tomato', quantity: 3, unit: 'medium' },
        { name: 'Onion', quantity: 1, unit: 'medium' },
        { name: 'Curry leaves', quantity: 8, unit: 'leaves', optional: true },
        { name: 'Oil', quantity: 2, unit: 'tbsp' },
        { name: 'Mustard seeds', quantity: 1, unit: 'tsp' },
        { name: 'Red chilli powder', quantity: 1, unit: 'tsp' },
        { name: 'Salt', quantity: '', unit: 'to taste' },
        { name: 'Water', quantity: 2, unit: 'cups' }
      ],
      steps: [
        'Rinse the rice and soak it for 10 minutes. Chop the tomatoes and onion.',
        'Heat the oil, add the mustard seeds and curry leaves. When the seeds pop, add the onion and cook until soft.',
        'Add the tomatoes, chilli powder and salt. Cook until they break down into a thick masala.',
        'Add the drained rice and stir for 1 minute. Pour in 2 cups of hot water.',
        'Cover and cook on low for 12 to 15 minutes until the rice is fluffy. Rest 5 minutes before serving.'
      ]
    },
    {
      id: 'egg-fried-rice',
      name: 'Egg Fried Rice',
      emoji: '🍚',
      image: '',
      category: 'Lunch',
      prepMinutes: 10,
      cookMinutes: 10,
      difficulty: 'Easy',
      servings: 2,
      ingredients: [
        { name: 'Rice', quantity: 2, unit: 'cups, cooked and cooled' },
        { name: 'Eggs', quantity: 2, unit: 'pcs' },
        { name: 'Carrot', quantity: 1, unit: 'medium' },
        { name: 'Onion', quantity: 1, unit: 'small' },
        { name: 'Soy sauce', quantity: 1, unit: 'tbsp' },
        { name: 'Spring onion', quantity: 2, unit: 'stalks', optional: true },
        { name: 'Oil', quantity: 1, unit: 'tbsp' },
        { name: 'Black pepper', quantity: '', unit: 'to taste' }
      ],
      steps: [
        'Dice the carrot and onion into small pieces. Break up any clumps in the cold rice.',
        'Heat the oil in a wok on high heat. Stir-fry the carrot and onion for 3 minutes.',
        'Push the vegetables aside, pour in the beaten eggs and scramble until just set.',
        'Add the rice and soy sauce and toss on high heat for 3 minutes.',
        'Finish with pepper and sliced spring onion.'
      ]
    },
    {
      id: 'banana-oat-pancakes',
      name: 'Banana Oat Pancakes',
      emoji: '🥞',
      image: '',
      category: 'Breakfast',
      prepMinutes: 5,
      cookMinutes: 10,
      difficulty: 'Easy',
      servings: 2,
      ingredients: [
        { name: 'Bananas', quantity: 2, unit: 'ripe' },
        { name: 'Oats', quantity: 1, unit: 'cup' },
        { name: 'Eggs', quantity: 1, unit: 'pc' },
        { name: 'Milk', quantity: 0.5, unit: 'cup' },
        { name: 'Honey', quantity: 1, unit: 'tbsp', optional: true },
        { name: 'Oil', quantity: 1, unit: 'tsp' }
      ],
      steps: [
        'Blend the oats into a coarse flour.',
        'Mash the bananas in a bowl, then whisk in the egg and milk.',
        'Stir in the oat flour and rest the batter for 5 minutes.',
        'Lightly grease a pan on medium heat and pour small rounds of batter.',
        'Cook 2 minutes per side until golden. Serve with honey.'
      ]
    },
    {
      id: 'creamy-spinach-potato-soup',
      name: 'Creamy Spinach Potato Soup',
      emoji: '🥣',
      image: '',
      category: 'Lunch',
      prepMinutes: 10,
      cookMinutes: 20,
      difficulty: 'Easy',
      servings: 3,
      ingredients: [
        { name: 'Spinach', quantity: 200, unit: 'g' },
        { name: 'Potatoes', quantity: 1, unit: 'large' },
        { name: 'Onion', quantity: 1, unit: 'small' },
        { name: 'Garlic', quantity: 2, unit: 'cloves' },
        { name: 'Milk', quantity: 1, unit: 'cup' },
        { name: 'Butter', quantity: 1, unit: 'tbsp' },
        { name: 'Salt', quantity: '', unit: 'to taste' },
        { name: 'Black pepper', quantity: '', unit: 'to taste' }
      ],
      steps: [
        'Melt the butter in a pot. Cook the chopped onion and garlic for 3 minutes.',
        'Add the diced potato and 2 cups of water. Simmer for 10 minutes until soft.',
        'Add the spinach and cook for 2 minutes until wilted.',
        'Blend until smooth, return to the pot and stir in the milk.',
        'Warm through on low heat and season with salt and pepper.'
      ]
    },
    {
      id: 'roasted-tomato-soup',
      name: 'Roasted Tomato Soup',
      emoji: '🍲',
      image: '',
      category: 'Lunch',
      prepMinutes: 10,
      cookMinutes: 25,
      difficulty: 'Easy',
      servings: 3,
      ingredients: [
        { name: 'Tomato', quantity: 6, unit: 'medium' },
        { name: 'Onion', quantity: 1, unit: 'medium' },
        { name: 'Garlic', quantity: 3, unit: 'cloves' },
        { name: 'Olive oil', quantity: 2, unit: 'tbsp' },
        { name: 'Milk', quantity: 0.25, unit: 'cup', optional: true },
        { name: 'Basil', quantity: 6, unit: 'leaves', optional: true },
        { name: 'Water', quantity: 1, unit: 'cup' },
        { name: 'Salt', quantity: '', unit: 'to taste' },
        { name: 'Black pepper', quantity: '', unit: 'to taste' }
      ],
      steps: [
        'Halve the tomatoes and quarter the onion. Toss with garlic, olive oil and salt on a tray.',
        'Roast at 200°C for 20 minutes until the edges char.',
        'Transfer to a pot with 1 cup of water and blend until smooth.',
        'Simmer for 5 minutes. Stir in the milk if you like a creamier soup.',
        'Season with pepper and top with torn basil.'
      ]
    },
    {
      id: 'cucumber-raita',
      name: 'Cucumber Raita',
      emoji: '🥒',
      image: '',
      category: 'Snack',
      prepMinutes: 5,
      cookMinutes: 0,
      difficulty: 'Easy',
      servings: 3,
      ingredients: [
        { name: 'Yogurt', quantity: 1, unit: 'cup' },
        { name: 'Cucumber', quantity: 1, unit: 'medium' },
        { name: 'Coriander leaves', quantity: 1, unit: 'tbsp', optional: true },
        { name: 'Cumin powder', quantity: 0.5, unit: 'tsp' },
        { name: 'Salt', quantity: '', unit: 'to taste' }
      ],
      steps: [
        'Grate or finely dice the cucumber and squeeze out excess water.',
        'Whisk the yogurt until smooth.',
        'Fold in the cucumber, cumin powder and salt.',
        'Chill for 10 minutes and garnish with coriander before serving.'
      ]
    },
    {
      id: 'paneer-bhurji',
      name: 'Paneer Bhurji',
      emoji: '🧀',
      image: '',
      category: 'Dinner',
      prepMinutes: 10,
      cookMinutes: 12,
      difficulty: 'Easy',
      servings: 2,
      ingredients: [
        { name: 'Paneer', quantity: 200, unit: 'g, crumbled' },
        { name: 'Onion', quantity: 1, unit: 'medium' },
        { name: 'Tomato', quantity: 1, unit: 'medium' },
        { name: 'Green chilli', quantity: 1, unit: 'pc' },
        { name: 'Coriander leaves', quantity: 2, unit: 'tbsp', optional: true },
        { name: 'Oil', quantity: 1, unit: 'tbsp' },
        { name: 'Turmeric powder', quantity: 0.25, unit: 'tsp' },
        { name: 'Garam masala', quantity: 0.5, unit: 'tsp' },
        { name: 'Salt', quantity: '', unit: 'to taste' }
      ],
      steps: [
        'Chop the onion, tomato and chilli finely. Crumble the paneer with your hands.',
        'Heat the oil and cook the onion and chilli until soft.',
        'Add the tomato, turmeric and salt, and cook until pulpy.',
        'Add the paneer and garam masala. Stir for 3 to 4 minutes.',
        'Garnish with coriander and serve with toast or roti.'
      ]
    },
    {
      id: 'tomato-cheese-toast',
      name: 'Tomato Cheese Toast',
      emoji: '🥪',
      image: '',
      category: 'Snack',
      prepMinutes: 5,
      cookMinutes: 8,
      difficulty: 'Easy',
      servings: 2,
      ingredients: [
        { name: 'Bread', quantity: 4, unit: 'slices' },
        { name: 'Cheese', quantity: 60, unit: 'g, grated' },
        { name: 'Tomato', quantity: 1, unit: 'medium' },
        { name: 'Onion', quantity: 0.5, unit: 'small', optional: true },
        { name: 'Black pepper', quantity: '', unit: 'to taste' }
      ],
      steps: [
        'Slice the tomato thinly and chop the onion finely.',
        'Top each bread slice with tomato, onion and grated cheese.',
        'Toast in a pan with the lid on, or grill for 6 to 8 minutes until the cheese melts.',
        'Sprinkle with black pepper and serve hot.'
      ]
    },
    {
      id: 'banana-yogurt-smoothie',
      name: 'Banana Yogurt Smoothie',
      emoji: '🍌',
      image: '',
      category: 'Snack',
      prepMinutes: 5,
      cookMinutes: 0,
      difficulty: 'Easy',
      servings: 2,
      ingredients: [
        { name: 'Bananas', quantity: 2, unit: 'ripe' },
        { name: 'Yogurt', quantity: 1, unit: 'cup' },
        { name: 'Milk', quantity: 0.5, unit: 'cup' },
        { name: 'Honey', quantity: 1, unit: 'tbsp', optional: true }
      ],
      steps: [
        'Peel the bananas and break them into chunks.',
        'Add the bananas, yogurt, milk and honey to a blender.',
        'Blend for 45 seconds until smooth.',
        'Pour into glasses and serve immediately.'
      ]
    },
    {
      id: 'rice-kheer',
      name: 'Rice Kheer',
      emoji: '🍮',
      image: '',
      category: 'Dessert',
      prepMinutes: 5,
      cookMinutes: 35,
      difficulty: 'Medium',
      servings: 4,
      ingredients: [
        { name: 'Milk', quantity: 1, unit: 'litre' },
        { name: 'Rice', quantity: 0.25, unit: 'cup' },
        { name: 'Sugar', quantity: 4, unit: 'tbsp' },
        { name: 'Cardamom', quantity: 3, unit: 'pods, crushed' },
        { name: 'Almonds', quantity: 10, unit: 'pcs, sliced', optional: true }
      ],
      steps: [
        'Rinse the rice and soak it for 20 minutes.',
        'Bring the milk to a boil in a heavy pot, then lower the heat.',
        'Add the drained rice and simmer for 30 minutes, stirring often so it does not stick.',
        'Stir in the sugar and cardamom and cook for 5 more minutes until thick and creamy.',
        'Top with almonds. Serve warm or chilled.'
      ]
    },
    {
      id: 'garlic-roasted-potatoes',
      name: 'Garlic Roasted Potatoes',
      emoji: '🥔',
      image: '',
      category: 'Dinner',
      prepMinutes: 10,
      cookMinutes: 30,
      difficulty: 'Easy',
      servings: 3,
      ingredients: [
        { name: 'Potatoes', quantity: 4, unit: 'medium' },
        { name: 'Garlic', quantity: 4, unit: 'cloves' },
        { name: 'Olive oil', quantity: 3, unit: 'tbsp' },
        { name: 'Rosemary', quantity: 1, unit: 'tsp', optional: true },
        { name: 'Salt', quantity: '', unit: 'to taste' },
        { name: 'Black pepper', quantity: '', unit: 'to taste' }
      ],
      steps: [
        'Heat the oven to 220°C. Cut the potatoes into wedges and crush the garlic.',
        'Toss everything with olive oil, salt, pepper and rosemary on a baking tray.',
        'Roast for 30 minutes, turning once, until crisp and golden.',
        'Serve hot with yogurt or a simple salad.'
      ]
    },
    {
      id: 'spinach-egg-toast',
      name: 'Spinach Egg Toast',
      emoji: '🍞',
      image: '',
      category: 'Breakfast',
      prepMinutes: 5,
      cookMinutes: 8,
      difficulty: 'Easy',
      servings: 1,
      ingredients: [
        { name: 'Bread', quantity: 2, unit: 'slices' },
        { name: 'Eggs', quantity: 2, unit: 'pcs' },
        { name: 'Spinach', quantity: 60, unit: 'g' },
        { name: 'Butter', quantity: 1, unit: 'tsp', optional: true },
        { name: 'Salt', quantity: '', unit: 'to taste' },
        { name: 'Black pepper', quantity: '', unit: 'to taste' }
      ],
      steps: [
        'Toast the bread and butter it lightly.',
        'Wilt the spinach in a hot pan for 1 minute and set aside.',
        'Scramble or fry the eggs in the same pan with salt and pepper.',
        'Pile the spinach and eggs onto the toast and serve at once.'
      ]
    }
  ];

  // --------------------------------------------------------------------------
  // MOCK INVENTORY (DEMO ONLY)
  // Same shape the adapter hands to the engine:
  //   { id, name, quantity, unit, status: "fresh" | "use_soon" | "expired" }
  // The names intentionally differ from the recipes ("Baby Spinach",
  // "Greek Yogurt") to show the name normaliser at work. The first four items
  // match the dashboard's sample "Use Soon" items.
  // --------------------------------------------------------------------------
  const mockInventory = [
    { id: 'inv-1', name: 'Baby Spinach', quantity: 200, unit: 'g', status: 'use_soon' },
    { id: 'inv-2', name: 'Organic Whole Milk', quantity: 1, unit: 'L', status: 'use_soon' },
    { id: 'inv-3', name: 'Greek Yogurt (Plain)', quantity: 500, unit: 'g', status: 'use_soon' },
    { id: 'inv-4', name: 'Ripe Bananas', quantity: 4, unit: 'pcs', status: 'use_soon' },
    { id: 'inv-5', name: 'Tomatoes', quantity: 5, unit: 'pcs', status: 'fresh' },
    { id: 'inv-6', name: 'Onions', quantity: 4, unit: 'pcs', status: 'fresh' },
    { id: 'inv-7', name: 'Potatoes', quantity: 6, unit: 'pcs', status: 'fresh' },
    { id: 'inv-8', name: 'Eggs', quantity: 8, unit: 'pcs', status: 'fresh' },
    { id: 'inv-9', name: 'Basmati Rice', quantity: 1, unit: 'kg', status: 'fresh' },
    { id: 'inv-10', name: 'Cheddar Cheese', quantity: 200, unit: 'g', status: 'fresh' },
    { id: 'inv-11', name: 'Garlic', quantity: 1, unit: 'bulb', status: 'fresh' },
    { id: 'inv-12', name: 'Whole Wheat Bread', quantity: 1, unit: 'loaf', status: 'fresh' },
    // Expired on purpose: it is ignored when matching (see "Cucumber Raita").
    { id: 'inv-13', name: 'Cucumber', quantity: 1, unit: 'pc', status: 'expired' }
  ];

  root.RecipeData = { recipes: recipes, mockInventory: mockInventory };
})(typeof window !== 'undefined' ? window : globalThis);
