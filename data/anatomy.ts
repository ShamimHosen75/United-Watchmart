type Localized = { en: string; ar: string };
type Vec3 = [number, number, number];

export type AnatomyPart = {
  id: "crystal" | "bezel" | "dial" | "movement" | "case" | "bracelet";
  title: Localized;
  does: Localized;
  made: Localized;
  /** Mesh names in /models/hero.glb that belong to this part. */
  meshes: string[];
  /** Camera preset used by the Anatomy page when this chapter is active (the watch faces +z). */
  camera: { position: Vec3; target: Vec3 };
};

export const anatomy: readonly AnatomyPart[] = [
  {
    id: "crystal",
    title: { en: "Sapphire crystal", ar: "زجاج الياقوت" },
    does: {
      en: "The crystal seals the face of the watch and keeps dust and water out. It has to stay perfectly clear for decades, so it is made from a material that only diamond can scratch.",
      ar: "يُغلق الزجاج واجهة الساعة ويمنع دخول الغبار والماء. ويجب أن يبقى صافياً تماماً لعقود، لذلك يُصنع من مادة لا يخدشها إلا الألماس.",
    },
    made: {
      en: "Synthetic sapphire is grown as a single crystal at over 2,000 °C, sliced, then ground and polished into a gentle dome. An anti-reflective coating on the inside removes glare without making the surface fragile.",
      ar: "يُنمّى الياقوت الصناعي كبلورة واحدة في حرارة تتجاوز 2,000 درجة مئوية، ثم يُقطع ويُجلخ ويُصقل على شكل قبة خفيفة. وتزيل طبقة مضادة للانعكاس على الوجه الداخلي الوهج دون أن تُضعف السطح.",
    },
    meshes: ["Crystal", "Crystal_Gasket"],
    camera: { position: [0.6, 0.5, 4.2], target: [0, 0, 0.2] },
  },
  {
    id: "bezel",
    title: { en: "Bezel", ar: "الإطار" },
    does: {
      en: "The bezel is the ring that holds the crystal in place. On sports models it also carries a scale, such as a tachymeter, for reading speed or elapsed time at a glance.",
      ar: "الإطار هو الحلقة التي تثبّت الزجاج في مكانه. وفي الطرازات الرياضية يحمل أيضاً تدريجاً، مثل التاكيمتر، لقراءة السرعة أو الوقت المنقضي بنظرة واحدة.",
    },
    made: {
      en: "Gold bezels are turned from a solid ring on a lathe, then polished by hand. Ceramic bezels are pressed from powder, fired in a kiln and engraved, so their colour and numerals never fade.",
      ar: "تُخرط الإطارات الذهبية من حلقة صلبة على المخرطة ثم تُصقل يدوياً. أما إطارات السيراميك فتُكبس من مسحوق وتُحرق في فرن ثم تُنقش، فلا يبهت لونها ولا أرقامها أبداً.",
    },
    meshes: ["Bezel", "Bezel_Insert"],
    camera: { position: [2.2, 1.4, 3.4], target: [0, 0, 0.1] },
  },
  {
    id: "dial",
    title: { en: "Dial and hands", ar: "الميناء والعقارب" },
    does: {
      en: "The dial and hands are how the watch speaks. Indices mark the hours, the hands point to them, and luminous material lets you read the time in the dark.",
      ar: "الميناء والعقارب هي لغة الساعة. تحدد المؤشرات الساعات، وتشير إليها العقارب، وتتيح المادة المضيئة قراءة الوقت في الظلام.",
    },
    made: {
      en: "A brass blank is stamped, then brushed in radiating lines to create the sunburst before it is lacquered. Indices are set by hand one at a time. Hands are cut, faceted and balanced so they move evenly.",
      ar: "يُختم قرص من النحاس، ثم يُفرّش بخطوط متشعبة لصنع اللمسة الشمسية قبل طلائه بالورنيش. وتُركَّب المؤشرات يدوياً واحداً تلو الآخر. أما العقارب فتُقطع وتُشطف وتُوزن لتتحرك بانتظام.",
    },
    meshes: ["Dial", "Indices", "Hand_Hour", "Hand_Minute", "Hand_Second"],
    camera: { position: [0, 0, 3.6], target: [0, 0, 0] },
  },
  {
    id: "movement",
    title: { en: "Movement", ar: "الحركة" },
    does: {
      en: "The movement is the engine. A spring stores energy, the gear train releases it in steps, and the balance wheel swings back and forth eight times a second to keep each step exactly the same length.",
      ar: "الحركة هي المحرّك. يخزّن النابض الطاقة، وتطلقها سلسلة التروس على مراحل، ويتأرجح الميزان ذهاباً وإياباً ثماني مرات في الثانية ليجعل كل مرحلة بالطول نفسه تماماً.",
    },
    made: {
      en: "Around two hundred parts are cut, finished and assembled by hand. Bridges are bevelled and decorated with stripes, and the rotor that winds the watch swings on a ball bearing with every move of the wrist.",
      ar: "يُقطع نحو مئتي جزء ويُشطَّب ويُجمَّع يدوياً. تُشطف الجسور وتُزيَّن بالخطوط، ويتأرجح الدوّار الذي يملأ الساعة على محمل كروي مع كل حركة للمعصم.",
    },
    meshes: ["Movement", "Rotor", "Balance_Wheel"],
    camera: { position: [-1.8, -0.5, -3.4], target: [0, 0, 0] },
  },
  {
    id: "case",
    title: { en: "Case", ar: "العلبة" },
    does: {
      en: "The case protects the movement from water, dust and knocks. The case back screws down against a gasket to seal it, and the crown lets you wind and set the watch without breaking that seal.",
      ar: "تحمي العلبة الحركة من الماء والغبار والصدمات. ويُثبَّت الغطاء الخلفي بالبراغي على حشية لإحكام الإغلاق، ويتيح التاج ملء الساعة وضبطها دون كسر هذا الإحكام.",
    },
    made: {
      en: "Steel and gold cases are forged, then milled in many passes. Every surface is finished by hand, with brushed flanks and polished bevels, before the case is pressure-tested in water.",
      ar: "تُطرق علب الفولاذ والذهب ثم تُفرز على مراحل عدة. ويُشطَّب كل سطح يدوياً، بجوانب مفرّشة وحواف مصقولة، قبل اختبار العلبة تحت ضغط الماء.",
    },
    meshes: ["Case", "Caseback", "Crown"],
    camera: { position: [3.6, 0.4, 1.4], target: [0, 0, 0] },
  },
  {
    id: "bracelet",
    title: { en: "Bracelet", ar: "السوار" },
    does: {
      en: "The bracelet holds the watch to the wrist and spreads its weight. A good one feels like fabric: every link moves freely, and the clasp opens easily but never by accident.",
      ar: "يثبّت السوار الساعة على المعصم ويوزّع وزنها. والسوار الجيد يشبه القماش: كل حلقة تتحرك بحرية، والمشبك يُفتح بسهولة لكنه لا يُفتح صدفة أبداً.",
    },
    made: {
      en: "Solid links are machined, then joined with screws rather than friction pins, so they can be adjusted and serviced. Each link is brushed or polished by hand to match the case.",
      ar: "تُصنع الحلقات الصلبة آلياً ثم تُربط ببراغٍ بدلاً من الدبابيس، لتسهل معايرتها وصيانتها. وتُفرّش كل حلقة أو تُصقل يدوياً لتطابق العلبة.",
    },
    meshes: ["Bracelet_Top", "Bracelet_Bottom", "Clasp"],
    camera: { position: [1.2, -3.6, 4.4], target: [0, -1.2, 0] },
  },
];

/** Camera before the first chapter: the whole watch. */
export const anatomyOverview: AnatomyPart["camera"] = { position: [2.4, 0.9, 6.8], target: [0, 0, 0] };
