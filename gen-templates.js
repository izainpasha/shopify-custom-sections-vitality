// Generates templates/product.vc-regular.json and product.vc-extra.json from the GemPages reference content.
const fs = require('fs');
const path = require('path');
const out = process.argv[2];
const img = (f) => `shopify://shop_images/${f}`;

let n = 0;
const blocks = (list) => {
  const b = {}, order = [];
  for (const [type, settings] of list) { const id = `${type}_${++n}`; b[id] = { type, settings }; order.push(id); }
  return { blocks: b, block_order: order };
};

const PLAN_50_MONTHLY = '7340818651';
const PLAN_50_3MONTHS = '7565672667';
// Created in Recharge (plan 23460475) for the 6-bottle Extra Strength subscription.
const PLAN_50_6MONTHS = '7571800283';

const LIVER = { perks_heading: 'Free gift with this bundle', perk_1: 'Beef Liver Capsules', perk_1_image: img('beef_organs.png') };
// Subscription perks: only the Beef Liver Capsules on 6 bottles.
// Subscription perks: the eBook + Ritual Gift come with the 3-bottle subscription.
const GIFTS = { perks_heading: 'Free gifts with every Subscribe & Save order', perk_1: 'Cleansing Protocol eBook', perk_1_image: img('bonus1.png'), perk_2: 'The Ritual Gift', perk_2_image: img('Screenshot2026-01-26at5.01.46PM.png') };
// The Ritual Gift is an unlisted $0 product, added to the cart with the 3-bottle subscription.
// The eBook is recorded on the subscription line as a line item property.
const RITUAL_ONLY = { perks_heading: 'Free gift with every Subscribe & Save order', perk_1: 'The Ritual Gift', perk_1_image: img('Screenshot2026-01-26at5.01.46PM.png'), gift_product: 'ritual-gift' };
// Ritual Gift (real $0 cart line) with every subscription; the eBook (line item property) with 3 bottles.
const subPerks = (qty) => {
  if (qty === 3) return { ...GIFTS, gift_product: 'ritual-gift', property_name: 'Free gift', property_value: 'Cleansing Protocol eBook' };
  if (qty === 1) return RITUAL_ONLY;
  return {};
};

// Tiers from the live Kaching Bundles deal blocks.
const PRODUCTS = {
  regular: {
    tiers: [
      { qty: 1, title: '1 Bottle', subtitle: '30 Day Supply', image: 'Kaching-Bundles-Screenshot_2026-08-10_at_10.46.07_PM.png', bundle: '75' },
      { qty: 3, title: 'Buy 2, Get 1 FREE', subTitle: '3 Bottles', subtitle: '90 Day Supply', image: 'Kaching-Bundles-Screenshot_2026-08-10_at_10.10.38_PM_70c7b20c-d8c3-4085-9e81-75f4d17437f6.png', bundle: '150', label: 'MOST POPULAR', selected: true },
    ],
    bundleSection: { qty: 3, price: '150', heading: 'Buy 2, Get 1 FREE', button: 'Get 3 Bottles', image: 'Kaching-Bundles-Screenshot_2026-08-10_at_10.10.38_PM_70c7b20c-d8c3-4085-9e81-75f4d17437f6.png',
      items: [['3 bottles of Vitality Capsules', ''], ['90 day supply', '']] },
    // Customer videos from the live Sternify UGC slider, same order.
    videos: ['30543e-billo-241475-orig.mp4', 'default(1)_320337a1-09e2-4935-b4f2-60b77310e059.mp4', '4 vitality capsules-3.mp4'],
    bundleFaq: 'Buy 2, Get 1 FREE gives you 3 bottles (a 90 day supply) for the price of 2. You can also get the same bottle counts on Subscribe & Save at 50% off.',
  },
  extra: {
    tiers: [
      { qty: 1, title: '1 Bottle', subtitle: '30 Day Supply', image: 'Kaching-Bundles-Screenshot_2026-08-10_at_10.19.38_PM.png', bundle: '85' },
      { qty: 3, title: 'Buy 2, Get 1 FREE', subTitle: '3 Bottles', subtitle: '90 Day Supply', image: 'generated-1786418224583.png', bundle: '170', label: 'MOST POPULAR', selected: true },
      { qty: 6, title: 'Buy 4, Get 2 FREE', subTitle: '6 Bottles', subtitle: '180 Day Supply', image: 'generated-1789398256606.png', bundle: '330', label: 'BEST VALUE', perks: LIVER },
    ],
    bundleSection: { qty: 6, price: '330', heading: 'Buy 4, Get 2 FREE', button: 'Get 6 Bottles', image: 'generated-1789398256606.png',
      items: [['6 bottles of Vitality Capsules', ''], ['180 day supply', ''], ['Beef Liver Capsules', 'free']] },
    videos: ['default(3).mp4', 'default(2).mp4', 'default_5b22a17f-2d20-4c54-bf2e-38c5c11f3c97.mp4'],
    bundleFaq: 'Buy 2, Get 1 FREE gives you 3 bottles (a 90 day supply) for the price of 2. Buy 4, Get 2 FREE gives you 6 bottles (a 180 day supply) for the price of 4, plus free Beef Liver Capsules. You can also get the same bottle counts on Subscribe & Save at 50% off.',
  },
};

const SUB_PLAN = { 1: [PLAN_50_MONTHLY, 'then [price] every month'], 3: [PLAN_50_3MONTHS, 'then [price] every 3 months'], 6: [PLAN_50_6MONTHS, 'then [price] every 6 months'] };

function offerBlocks(tiers) {
  // Subscriptions: 1 and 3 bottles only (the 6-bottle subscription was dropped).
  const sub = tiers.filter((t) => t.qty <= 3).map((t) => ['offer', {
    purchase_type: 'subscribe', quantity: t.qty, title: t.subTitle || t.title, subtitle: t.subtitle, image: img(t.image),
    label: t.label || '', show_per_day: false, selected: !!t.selected,
    selling_plan_id: SUB_PLAN[t.qty][0], then_text: SUB_PLAN[t.qty][1], bundle_price: '', ...subPerks(t.qty),
  }]);
  const once = tiers.map((t) => ['offer', {
    purchase_type: 'onetime', quantity: t.qty, title: t.title, subtitle: t.subtitle, image: img(t.image),
    label: t.label || '', show_per_day: false, selected: !!t.selected,
    selling_plan_id: '', then_text: '', bundle_price: t.bundle, ...(t.perks || {}),
  }]);
  return [...sub, ...once];
}

function mainProduct({ gallery, tiers, videos }) {
  return {
    type: 'vc-main-product',
    ...blocks([
      ...gallery.map((f) => ['gallery_image', { image: img(f) }]),
      ['bullet', { bold: 'Helps you go every day.', text: 'Gentle relief from occasional constipation.*' }],
      ['bullet', { bold: 'No more feeling stuck.', text: 'Take one at dinner. Go in the morning.*' }],
      ['bullet', { bold: 'Less bloating.', text: 'Your belly feels calm and light.*' }],
      ['bullet', { bold: 'Made from 8 plants.', text: 'No fiber drinks. No fillers.' }],
      ...offerBlocks(tiers),
      ...videos.map((v) => ['ugc_video', { video: 'shopify://files/videos/' + v }]),
      ['accordion', { title: 'Ingredients', content: '<p><strong>Regular Strength:</strong> Cape Aloe, Senna, Barberry, Cascara Sagrada, Garlic, Ginger, Clove, Turmeric.</p><p><strong>Extra Strength:</strong> the same eight herbs, plus Cayenne.</p><p>90 vegan capsules per bottle. No fillers, no synthetic additives.</p>' }],
      ['accordion', { title: 'How to take it', content: "<p>Take one capsule with dinner and a full glass of water. If nothing by the next morning, take two the next night. Once you're going every day, stay at that amount. Never go past the amount printed on the label.</p><p>Each bottle has 90 capsules. At one a day, that's up to a 3-month supply.</p>" }],
      ['accordion', { title: 'Who should not take it', content: '<p>Do not take Vitality Capsules if you are pregnant, breastfeeding or on blood thinners. Not for children. See the full safety panel at the bottom of this page.</p>' }],
    ]),
    settings: {
      background: '#FFFFFF',
      badge: 'SAVE UP TO 50%',
      stat_1: '25,000+ Happy Customers', stat_2: '1 million+ bottles sold', stat_3: '90-day guarantee',
      pill: 'Promotes regular bowel movements',
      title: 'Vitality Capsules',
      subtitle: 'Formulated by Dr. Jennifer Daniels',
      rating_text: 'Rated 4.8 out of 5 stars', reviews_text: '1,771 reviews', reviews_link: '#vc-reviews',
      strength_heading: '1. Choose your strength',
      strength_product_1: 'vitality-capsules-regular-strength', strength_label_1: 'Regular Strength',
      strength_product_2: 'vitality-capsules-extra-strength', strength_label_2: 'Extra Strength',
      buy_heading: '2. Choose how you buy',
      tab_subscribe: 'Subscribe <em>&amp; Save 50%</em>', tab_once: 'Buy Once',
      capsules_per_bottle: 90,
      atc_label: 'Add to Cart | [price]',
      sub_note: 'Subscription renews automatically at the price shown until you cancel. Cancel anytime by phone or email, with no fees.',
      secure_note: '🔒 Secure checkout  |  Made in the USA',
      ugc_heading: 'Trusted by <strong>25,000+</strong> daily users',
      trust_1: '90-Day Money-Back Guarantee.', trust_2: 'Pay with HSA/FSA',
      formulator_image: img('hf_20260520_025643_2757c77a-c041-4630-85fa-1efa166d3083_1.png'), formulator_text: 'Formulated by Dr. Jennifer Daniels',
      phone_intro: "Rather order by phone? We're real people.", phone: '561-576-6244', phone_hours: 'Monday to Friday, 10 am to 6 pm EST',
    },
  };
}

const mt = (settings, list) => ({ type: 'vc-media-text', ...blocks(list), settings });

function content(product) {
  return {
    pain: mt(
      { image: img('hf_20260526_215414_b72687f1-2d4d-400a-9cb0-7d4d267394f2.png'), image_position: 'left', image_size: 'full', image_radius: 24, list_style: 'cross', scheme: 'light', background: '#FFFFFF', padding_top: 88, padding_bottom: 72 },
      [
        ['eyebrow', { text: 'Sound familiar?' }],
        ['heading', { text: 'You’re doing everything right. So why do you still feel stuck?' }],
        ['text', { text: '<p>You eat your vegetables. You drink your water. You stir the fiber into your glass every morning. And still, you wake up heavy, puffy and backed up.</p>' }],
        ['list_item', { text: 'Days go by without a real bowel movement' }],
        ['list_item', { text: 'You feel puffy and uncomfortable by the afternoon' }],
        ['list_item', { text: 'Fiber drinks make you feel more bloated, not less' }],
        ['list_item', { text: 'You plan your day around the bathroom' }],
      ]
    ),
    change: mt(
      { image: img('vitality_capsules_kitchen_routine.gif'), image_position: 'right', image_size: 'full', image_radius: 24, list_style: 'check', scheme: 'dark', background: '#1F3A2E', padding_top: 88, padding_bottom: 72 },
      [
        ['eyebrow', { text: 'Then, one small change' }],
        ['heading', { text: 'Your capsules with dinner. A different morning.' }],
        ['text', { text: '<p>Just one capsule with dinner, as part of your nightly routine. It’s the simple habit thousands of our customers rely on for more regular mornings.</p>' }],
        ['button', { label: 'Try It Risk-Free', link: '#vc-buy' }],
      ]
    ),
    hiw: {
      type: 'vc-how-it-works',
      ...blocks([
        ['step', { title: 'Take one at dinner', text: 'The herbs get to work quietly while you sleep.' }],
        ['step', { title: 'Support the waves', text: 'Traditional herbs like senna and cascara support your gut’s natural motion.*' }],
        ['step', { title: 'Go in the morning', text: 'Many people notice a difference by the next morning. Results vary.*' }],
      ]),
      settings: { eyebrow: 'How it works', heading: 'Fiber makes it bigger.\nYour gut needs help moving it.', lead: 'Fiber adds bulk to what’s already sitting there. Vitality Capsules work differently. They support the natural waves in your gut that move things along.', image: img('hf_20260707_123313_84e8f8e6-36f7-466d-8ed9-ad0c51ec06cd.png'), background: '#FFFFFF' },
    },
    reviews: {
      type: 'vc-reviews',
      blocks: {
        loox_reviews: {
          type: 'shopify://apps/loox-reviews/blocks/loox-dynamic-section/5c3b337f-fd14-4df5-b1d6-80ec13e6e28e',
          settings: { reviews_to_display: '', default_tab: 'automatic', only_photos: false, aggregated: false, limit: 20, hide_thumbnails: false, maxwidth: 1080, is_sample: false },
        },
      },
      block_order: ['loox_reviews'],
      settings: { eyebrow: 'Real customers', heading: 'In their own words.', score: '', score_text: '', background: '#F7F3EA' },
    },
    timeline: {
      type: 'vc-timeline',
      ...blocks([
        ['stage', { image: img('hf_20260618_194133_eefd72ce-8c29-412c-a5fb-d1602ed03b23_1.png'), tag: 'Night 1', title: 'Things start moving', text: 'Many people notice a difference by the next morning.*' }],
        ['stage', { image: img('July_-11.png'), tag: 'Week 2', title: 'Lighter, less bloated', text: 'That heavy, puffy feeling starts to fade.*' }],
        ['stage', { image: img('hf_20260828_135553_2467eb5c-ac1b-49a2-a060-0d42f7a3a74f.png'), tag: 'Day 90', title: 'Your new normal', text: 'Going every day is just part of life. You feel like yourself.*' }],
      ]),
      settings: { eyebrow: 'What to expect', heading: 'Feel it by morning.\nMake it your new normal in 90 days.', lead: 'The first night gets things moving. The weeks after are about rhythm, so going every day stops being something you think about.', button_label: 'Choose your bundle', button_link: '#vc-buy', background: '#FFFFFF' },
    },
    ingredients: {
      type: 'vc-ingredients',
      ...blocks([
        ['ingredient', { image: img('1_87d05393-3962-4346-8f6f-327d4bff1dca.png'), title: 'Cape Aloe', text: 'Used for centuries to support regularity.*' }],
        ['ingredient', { image: img('8_f957df4b-e9de-4f95-93a3-8d271eccaf0f.png'), title: 'Senna', text: 'A traditional herb that helps things move.*' }],
        ['ingredient', { image: img('7_e6444e53-db5b-40d7-8591-cdc8402b7988.png'), title: 'Cascara Sagrada', text: 'For gentle, overnight support.*' }],
        ['ingredient', { image: img('6_88f24513-cef9-4ce6-8911-0bd242a5616f.png'), title: 'Barberry', text: 'Traditionally used to support digestion.*' }],
        ['ingredient', { image: img('2_f3ba71d4-4ddb-4149-aa83-9bc5184eeccb.png'), title: 'Ginger', text: 'Supports digestive comfort.*' }],
        ['ingredient', { image: img('3_829187e8-0e2f-4cdb-bbe8-31fd50c2e1aa.png'), title: 'Turmeric', text: 'A kitchen staple for overall wellness.*' }],
        ['ingredient', { image: img('5_3dc7d8d1-4ac3-4d6a-9594-8d4dc6d1500e.png'), title: 'Garlic', text: 'A classic herb for whole-body support.*' }],
        ['ingredient', { image: img('4_3c603ba4-f510-4b73-8b01-2454117fcda6.png'), title: 'Clove', text: 'A warming spice used in traditional blends.' }],
      ]),
      settings: { eyebrow: 'What’s inside Vitality Capsules?', heading: 'Eight herbs people have trusted for generations.', lead: '', note: 'No fillers. No synthetic additives. Third-party tested and made in a GMP-certified facility in California.', background: '#F7F3EA' },
    },
    comparison: {
      type: 'vc-comparison',
      ...blocks(['One small capsule a day', 'Nothing to mix, stir or chug', 'Supports regularity by morning*', 'No extra bulk or bloating', '100% plant herbs, no fillers', '90-day money-back guarantee'].map((text) => ['row', { text }])),
      settings: { eyebrow: 'Why people switch', heading: 'Tired of fiber drinks that don’t work?', lead: '', us_label: 'Vitality Capsules', them_label: 'Fiber drinks & powders', background: '#FFFFFF' },
    },
    why: {
      type: 'vc-why-choose',
      ...blocks([
        ['tile', { icon: 'star', title: '4.8 stars', text: 'from 1,771 verified reviews' }],
        ['tile', { icon: 'shield', title: '90 day', text: 'Money-back guarantee. Keep the bottles.' }],
        ['tile', { icon: 'gift', title: 'Free gifts', text: 'with every Subscribe & Save order' }],
        ['tile', { icon: 'card', title: 'HSA/FSA', text: 'pay with your health card through TrueMed' }],
        ['tile', { icon: 'phone', title: 'Real people', text: 'on the phone, 6 days a week' }],
      ]),
      settings: { eyebrow: '', heading: 'Why people choose Vitality Capsules over other herbal formulas', lead: '', padding_top: 0, background: '#FFFFFF' },
    },
    bundle: {
      type: 'vc-bundle-offer',
      ...blocks(product.bundleSection.items.map(([text, free]) => ['item', { text, strike: '', free: free === 'free' }])),
      settings: { eyebrow: 'Our best value', heading: product.bundleSection.heading, lead: '', image: img(product.bundleSection.image), quantity: product.bundleSection.qty, bundle_price: product.bundleSection.price, terms: 'One-time purchase. No subscription.', button_label: product.bundleSection.button, guarantee: '90-day money-back guarantee', background: '#F7F3EA' },
    },
    founder: mt(
      { image: img('hf_20260907_152052_59ba3789-073d-4a62-b270-1741e8951581.png'), image_position: 'left', image_size: 'full', image_radius: 24, list_style: 'check', scheme: 'light', background: '#FFFFFF', padding_top: 88, padding_bottom: 72 },
      [
        ['eyebrow', { text: 'Trusted since 2006' }],
        ['heading', { text: 'A doctor’s formula, made the old-fashioned way.' }],
        ['text', { text: '<p>Vitality Capsules were formulated by Dr. Jennifer Daniels, our Doctor and Formulation Expert. Some of our customers have taken them every day for 10 years. They keep coming back for one reason: their mornings work again.</p>' }],
        ['list_item', { text: 'Small batches, no shortcuts' }],
        ['list_item', { text: 'Third-party tested for purity' }],
        ['list_item', { text: 'GMP-certified facility in California' }],
        ['list_item', { text: 'Over 1 million bottles sold' }],
      ]
    ),
    faq: {
      type: 'vc-faq',
      ...blocks([
        ['How do I take it?', 'One capsule with dinner and a full glass of water. If you haven’t gone by the next morning, take two the next night. Once you’re going every day, stay at that amount. Never go past the amount on the label.'],
        ['How long until it works?', 'Many people notice a difference by the next morning, but everyone is different and results vary. Take it every night for 90 days to build a steady routine.'],
        ['How is this different from fiber?', 'Fiber makes what’s sitting in your gut bigger and softer. It doesn’t help it move. Vitality Capsules use traditional herbs that support the natural waves that move things along.*'],
        ['Regular or Extra Strength?', 'Start with Regular Strength. Extra Strength is the same formula with cayenne added, for people who need a little more help.'],
        ['How do I get the free gifts?', 'Every Subscribe & Save order includes The Ritual Gift, and 3 Bottles with Subscribe & Save also includes the Cleansing Protocol eBook. Nothing extra to do. Buy Once options do not include these gifts.'],
        ['What do the bundles include?', product.bundleFaq],
        ['Can I take it if I’m on blood thinners?', 'No. Please do not take Vitality Capsules if you are on blood thinners, pregnant or breastfeeding. If you take any medicine, talk to your doctor first.'],
        ['How do I cancel my subscription?', 'Call us at <a href="tel:5615766244">561-576-6244</a> or send us an email. A real person will take care of it. No fees and no hard feelings.'],
        ['Can I use my HSA or FSA card?', 'Yes. We partner with TrueMed, so US customers can pay with HSA or FSA funds at checkout.'],
        ['What if it doesn’t work for me?', 'You’re covered by our 90-day money-back guarantee on every order. Call or email us for a full refund, and keep the bottles and the gifts.'],
      ].map(([question, answer]) => ['question', { question, answer: `<p>${answer}</p>` }])),
      settings: { eyebrow: 'FAQ', heading: 'Questions? We’ve got answers.', intro: 'Everything you need to know before your first bottle.', contact_title: 'Still have questions? Talk to a real person.', phone: '561-576-6244', email: 'info@vitalitycycles.com', hours: 'Monday to Friday, 9 am to 6 pm Eastern', background: '#F7F3EA' },
    },
    guarantee: {
      type: 'vc-guarantee',
      settings: { seal_top: '90', seal_bottom: 'Day guarantee', heading: '90-Day Money-Back Guarantee', text: 'Try it for 90 days. Not happy? Call or email us for a full refund. Keep the bottles and the gifts.', button_label: 'Try It Risk-Free', button_link: '#vc-buy', phone_label: 'Or call us', phone: '561-576-6244', hours: 'Monday to Friday, 9 am to 6 pm Eastern', background: '#FFFFFF' },
    },
  };
}

function template(gallery, key) {
  const product = PRODUCTS[key];
  const sections = { main: mainProduct({ gallery, tiers: product.tiers, videos: product.videos }), ...content(product) };
  return { sections, order: Object.keys(sections) };
}

const header = '/*\n * Vitality Capsules custom PDP (replaces the GemPages / Sternify layout).\n * Generated from the GemPages reference; edit in the theme editor.\n */\n';
const regularGallery = ['Creatives-RegularStrength_1.png', '22_0ad0865e-0bc3-43d8-8efa-29abdd9d4f6b.png', '20.png', '17_1ad080de-d201-4e18-9a16-dad64bcfddf7.png', '18.png', '21.png', '8_f95bfd7e-9db7-4832-b771-cbe18fdd7a9c.png'];
fs.writeFileSync(path.join(out, 'product.vc-regular.json'), header + JSON.stringify(template([], 'regular'), null, 2) + '\n');
n = 0;
// Both products use their own product images (no gallery blocks).
fs.writeFileSync(path.join(out, 'product.vc-extra.json'), header + JSON.stringify(template([], 'extra'), null, 2) + '\n');
console.log('written');
