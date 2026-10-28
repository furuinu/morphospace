/* MORPHOSPACE — explanatory text translations (same-origin, offline-capable). */
(function(){
 'use strict';
 const KEYS=["title","intro","purpose","name","qualiaHeading","qualiaDefinition","qualiaWorld","beingHeading","alone","heartbeat","encounter","existence","understand","listen","wonder","signature"];
 const DICTIONARY={
  "en": [
    "What is MORPHOSPACE?",
    "What if sweetness had a shape?\nWhat if aroma came alive as a creature?",
    "MORPHOSPACE is a laboratory for exploring the sensations we imagine from taste and aroma in the form of three-dimensional living beings.",
    "“Morpho” means form, and “space” means space. Here, the name suggests a realm of possibility where forms never seen before can emerge.",
    "Creatures Hidden in Qualia",
    "The roundness of sweetness, the sharpness of acidity, the depth of bitterness. We call the subjective qualities of sensation that words and numbers cannot fully convey “qualia.”",
    "In this world, such sensations inspire living forms composed of colors, patterns, skeletons, textures, and movement. What one person feels from a shape may be different from what another feels.",
    "Simply, Being Alive",
    "In an empty expanse, a single, solitary creature.",
    "Listen closely and you may hear its faint heartbeat. Patterns stir across its surface and lights flicker, as though it were trying to speak to someone.",
    "A once-in-a-lifetime encounter. A life unlike any other in the universe.",
    "Not for anyone. Not for any purpose.\nSimply there, simply alive.",
    "There is no need to understand anything.",
    "Just gaze absentmindedly at these beings and listen to their voices.",
    "And quietly let your thoughts wander into the world of qualia where they dwell.",
    "Owner of Masala Kitchen: Shinobu Mitsuji"
  ],
  "zh-TW": [
    "什麼是 MORPHOSPACE？",
    "如果甜味有形狀。\n如果香氣化作生物，開始活動。",
    "MORPHOSPACE（モルフォスペース）是一座實驗室，將味道與香氣喚起的感受化為立體生物來探索。",
    "「Morpho」意為形態，「Space」意為空間。在這裡，它們象徵一片充滿可能性的天地，讓前所未見的形體得以誕生。",
    "潛藏於感質之中的生物",
    "甜味的圓潤、酸味的銳利、苦味的深邃。這些難以只靠言語或數字傳達的主觀感受特質，被稱為「感質」（Qualia）。",
    "在這個世界裡，我們以這些感受為線索，結合色彩、花紋、骨架、質地與動作，想像生物的姿態。即使面對同一個形體，每個人的感受也不盡相同。",
    "只是，活在那裡",
    "空無一物的空間裡，只有一個孤獨的生物。",
    "側耳細聽，彷彿能聽見微弱的心跳。牠身上的花紋緩緩蠕動，光芒忽明忽暗，像是在向某個人訴說。",
    "一期一會。宇宙中獨一無二的生命。",
    "不是為了誰，也不是為了什麼。\n只是存在於那裡，只是活著。",
    "不必試著理解任何事。",
    "只需靜靜望著牠們，傾聽牠們的聲音。",
    "然後，讓思緒悄悄飄向牠們所棲居的感質世界。",
    "Masala Kitchen 店主：三辻 忍"
  ],
  "ko": [
    "MORPHOSPACE란?",
    "달콤함에 형태가 있다면.\n향기가 생명체가 되어 움직이기 시작한다면.",
    "MORPHOSPACE(모르포스페이스)는 맛과 향에서 떠오르는 감각을 입체적인 생명체의 모습으로 탐구하는 실험실입니다.",
    "‘모르포’는 형태를, ‘스페이스’는 공간을 뜻합니다. 여기서는 아직 본 적 없는 형태가 태어나는 가능성의 세계를 의미합니다.",
    "퀄리아에 숨어 있는 생명체들",
    "단맛의 둥글음, 신맛의 날카로움, 쓴맛의 깊이. 말과 숫자만으로 전할 수 없는 주관적 감각의 질을 ‘퀄리아’라고 합니다.",
    "이 세계에서는 그러한 감각을 실마리로 색, 무늬, 골격, 질감, 움직임을 결합해 생명체의 모습을 상상합니다. 같은 형상을 보고 느끼는 것도 사람마다 다릅니다.",
    "그저, 그곳에 살아 있다",
    "아무것도 없는 공간에 홀로 있는 생명체 하나.",
    "귀를 기울이면 희미한 심장박동이 들립니다. 누군가에게 말을 건네듯 몸 표면의 무늬가 꿈틀거리고 빛이 깜빡입니다.",
    "단 한 번뿐인 만남. 우주에 오직 하나뿐인 생명.",
    "누구를 위해서도, 무엇을 위해서도 아닌.\n그저 그곳에 존재하며, 그저 살아 있습니다.",
    "무언가를 이해하려 애쓰지 않아도 됩니다.",
    "멍하니 그 모습을 바라보며 그들의 목소리에 귀 기울입니다.",
    "그리고 그들이 깃든 퀄리아의 세계로 조용히 마음을 보내 봅니다.",
    "마살라 키친 주인: 미쓰지 시노부"
  ],
  "zh-CN": [
    "什么是 MORPHOSPACE？",
    "如果甜味有形状。\n如果香气化作生物，开始活动。",
    "MORPHOSPACE（形态空间）是一座实验室，将味道与香气唤起的感受化为立体生物，进行探索。",
    "“Morpho”意为形态，“Space”意为空间。在这里，它们象征着无限的可能，让前所未见的形态得以诞生。",
    "潜藏于感质之中的生物",
    "甜味的圆润、酸味的锐利、苦味的深邃。这些难以仅凭语言或数字传达的主观感受特质，被称为“感质”（Qualia）。",
    "在这个世界里，我们以这些感受为线索，结合色彩、花纹、骨架、质地与动作，想象生物的姿态。面对同一个形体，不同的人也会有不同的感受。",
    "只是，在那里活着",
    "空无一物的空间里，只有一个孤独的生物。",
    "侧耳细听，仿佛能听见微弱的心跳。它身上的花纹缓缓蠕动，光芒忽明忽暗，像是在向某个人诉说。",
    "一期一会。宇宙中独一无二的生命。",
    "不是为了谁，也不是为了什么。\n只是存在于那里，只是活着。",
    "不必试着理解任何事。",
    "只需静静地望着它们，倾听它们的声音。",
    "然后，让思绪悄悄飘向它们所栖居的感质世界。",
    "Masala Kitchen 店主：三辻 忍"
  ],
  "fr": [
    "Qu’est-ce que MORPHOSPACE ?",
    "Et si la douceur avait une forme ?\nEt si un parfum prenait vie et se mettait à bouger ?",
    "MORPHOSPACE est un laboratoire où les sensations évoquées par les goûts et les arômes prennent la forme d’êtres vivants en trois dimensions.",
    "« Morpho » renvoie à la forme, « space » à l’espace. Ensemble, ils évoquent ici un champ de possibles où naissent des formes encore inconnues.",
    "Les êtres cachés dans les qualia",
    "Les rondeurs du sucré, le tranchant de l’acide, la profondeur de l’amer. Ces qualités subjectives de l’expérience, que les mots et les chiffres ne peuvent pleinement transmettre, s’appellent les « qualia ».",
    "Dans cet univers, ces sensations inspirent des créatures imaginaires faites de couleurs, de motifs, de squelettes, de textures et de mouvements. Face à une même forme, chacun éprouve quelque chose de différent.",
    "Simplement, être en vie",
    "Dans un espace vide, une créature, seule.",
    "En tendant l’oreille, on perçoit un faible battement de cœur. Des motifs frémissent à sa surface et des lueurs scintillent, comme si elle cherchait à parler à quelqu’un.",
    "Une rencontre unique, sans lendemain. Une vie qui n’existe nulle part ailleurs dans l’univers.",
    "Ni pour quelqu’un, ni dans un but précis.\nSimplement là, simplement vivante.",
    "Nul besoin de chercher à comprendre.",
    "Contemplez ces êtres sans attente et écoutez leurs voix.",
    "Et laissez doucement vos pensées voyager vers le monde des qualia qu’ils habitent.",
    "Propriétaire de Masala Kitchen : Shinobu Mitsuji"
  ],
  "it": [
    "Che cos’è MORPHOSPACE?",
    "E se la dolcezza avesse una forma?\nE se un aroma prendesse vita come una creatura?",
    "MORPHOSPACE è un laboratorio in cui le sensazioni evocate da sapori e aromi vengono esplorate come esseri viventi tridimensionali.",
    "«Morpho» significa forma e «space» significa spazio. Qui il nome evoca un universo di possibilità in cui possono nascere forme mai viste.",
    "Le creature nascoste nei qualia",
    "La rotondità del dolce, la punta dell’acido, la profondità dell’amaro. Le qualità soggettive dell’esperienza che parole e numeri non riescono a esprimere fino in fondo si chiamano «qualia».",
    "In questo mondo, tali sensazioni ispirano creature immaginate attraverso colori, motivi, scheletri, trame e movimenti. Una stessa forma può suscitare sensazioni diverse in ogni osservatore.",
    "Semplicemente, essere vivi",
    "In uno spazio vuoto, una creatura tutta sola.",
    "Tendendo l’orecchio, si percepisce un battito lieve. I disegni sul suo corpo fremono e le luci pulsano, quasi volesse parlare a qualcuno.",
    "Un incontro irripetibile. Un essere unico in tutto l’universo.",
    "Non per qualcuno, non per uno scopo.\nSemplicemente lì, semplicemente vivo.",
    "Non c’è bisogno di capire nulla.",
    "Lasciate vagare lo sguardo su queste creature e ascoltate le loro voci.",
    "E lasciate che il pensiero raggiunga silenziosamente il mondo dei qualia in cui dimorano.",
    "Titolare di Masala Kitchen: Shinobu Mitsuji"
  ],
  "de": [
    "Was ist MORPHOSPACE?",
    "Was wäre, wenn Süße eine Form hätte?\nWenn ein Duft als Lebewesen zum Leben erwachte?",
    "MORPHOSPACE ist ein Labor, in dem Empfindungen, die Geschmack und Duft hervorrufen, als dreidimensionale Lebewesen erkundet werden.",
    "„Morpho“ steht für Form, „Space“ für Raum. Hier bezeichnet der Name einen Möglichkeitsraum, in dem bisher ungesehene Gestalten entstehen.",
    "Lebewesen, die sich in Qualia verbergen",
    "Die Rundheit der Süße, die Schärfe der Säure, die Tiefe des Bitteren. Solche subjektiven Erlebnisqualitäten, die sich mit Worten und Zahlen nicht vollständig vermitteln lassen, nennt man „Qualia“.",
    "In dieser Welt werden aus solchen Empfindungen Wesen aus Farben, Mustern, Skeletten, Oberflächen und Bewegungen erdacht. Dieselbe Gestalt kann bei jedem Menschen etwas anderes auslösen.",
    "Einfach nur lebendig",
    "In einem leeren Raum: ein einziges, einsames Wesen.",
    "Wer genau hinhört, vernimmt einen leisen Herzschlag. Muster regen sich auf seiner Haut, Lichter flackern, als wollte es mit jemandem sprechen.",
    "Eine Begegnung, die es nur einmal gibt. Ein Leben, einzigartig im ganzen Universum.",
    "Für niemanden. Ohne irgendeinen Zweck.\nEinfach nur da, einfach nur am Leben.",
    "Es ist nicht nötig, etwas verstehen zu wollen.",
    "Betrachten Sie diese Wesen ganz in Ruhe und lauschen Sie ihren Stimmen.",
    "Und lassen Sie Ihre Gedanken still in jene Welt der Qualia schweifen, in der sie verborgen leben.",
    "Inhaber von Masala Kitchen: Shinobu Mitsuji"
  ],
  "ru": [
    "Что такое MORPHOSPACE?",
    "А что, если бы у сладости была форма?\nЕсли бы аромат ожил и начал двигаться, словно существо?",
    "MORPHOSPACE — лаборатория, где ощущения, рождаемые вкусами и ароматами, исследуются в облике трёхмерных живых существ.",
    "«Морфо» означает форму, а «спейс» — пространство. Здесь это пространство возможностей, где возникают образы, которых ещё никто не видел.",
    "Существа, скрытые в квалиа",
    "Округлость сладкого, острота кислого, глубина горького. Субъективные качества ощущений, которые нельзя полностью выразить словами или числами, называются «квалиа».",
    "В этом мире ощущения становятся отправной точкой для воображаемых существ, сотканных из цветов, узоров, скелетов, фактур и движений. Один и тот же образ каждый воспринимает по-своему.",
    "Просто быть живым",
    "В пустом пространстве — одно-единственное, одинокое существо.",
    "Если прислушаться, можно уловить тихое сердцебиение. Узоры на его теле шевелятся, свет мерцает, словно оно пытается к кому-то обратиться.",
    "Мимолётная, неповторимая встреча. Единственная такая жизнь во всей Вселенной.",
    "Ни ради кого. Ни ради какой цели.\nПросто существует. Просто живёт.",
    "Не нужно пытаться что-либо понять.",
    "Просто смотрите на этих существ, ни о чём не думая, и слушайте их голоса.",
    "И пусть ваши мысли тихо унесутся в мир квалиа, где они обитают.",
    "Владелец Masala Kitchen: Синобу Мицудзи"
  ],
  "th": [
    "MORPHOSPACE คืออะไร",
    "ถ้าความหวานมีรูปร่างขึ้นมาล่ะ\nถ้ากลิ่นหอมกลายเป็นสิ่งมีชีวิตที่เคลื่อนไหวได้ล่ะ",
    "MORPHOSPACE คือห้องทดลองที่สำรวจความรู้สึกอันเกิดจากรสชาติและกลิ่นหอม โดยจินตนาการให้เป็นสิ่งมีชีวิตสามมิติ",
    "“Morpho” หมายถึงรูปร่าง และ “Space” หมายถึงพื้นที่ ที่นี่จึงเป็นพื้นที่แห่งความเป็นไปได้ ซึ่งรูปร่างที่ไม่เคยมีใครเห็นสามารถถือกำเนิดขึ้นได้",
    "สิ่งมีชีวิตที่ซ่อนอยู่ในควอเลีย",
    "ความกลมกล่อมของหวาน ความแหลมคมของเปรี้ยว ความลุ่มลึกของขม คุณภาพเฉพาะตัวของความรู้สึกที่ถ่ายทอดด้วยคำพูดหรือตัวเลขได้ไม่หมด เรียกว่า “ควอเลีย” (qualia)",
    "ในโลกนี้ เราใช้ความรู้สึกเหล่านั้นเป็นแรงบันดาลใจ สร้างภาพสิ่งมีชีวิตจากสีสัน ลวดลาย โครงกระดูก พื้นผิว และการเคลื่อนไหว แม้มองรูปร่างเดียวกัน แต่ละคนก็อาจรู้สึกต่างกัน",
    "เพียงแค่มีชีวิตอยู่ตรงนั้น",
    "ในห้วงอวกาศอันว่างเปล่า มีสิ่งมีชีวิตอยู่เพียงตัวเดียวอย่างโดดเดี่ยว",
    "ถ้าตั้งใจฟัง อาจได้ยินเสียงหัวใจเต้นแผ่วเบา ลวดลายบนร่างกายขยับไหว แสงกะพริบราวกับกำลังพูดกับใครสักคน",
    "การพบกันเพียงครั้งเดียว สิ่งมีชีวิตเพียงหนึ่งเดียวในจักรวาล",
    "ไม่ได้อยู่เพื่อใคร ไม่ได้อยู่เพื่อสิ่งใด\nเพียงดำรงอยู่ตรงนั้น เพียงมีชีวิตอยู่",
    "ไม่จำเป็นต้องพยายามเข้าใจอะไรเลย",
    "เพียงมองดูพวกเขาอย่างเหม่อลอย และรับฟังเสียงของพวกเขา",
    "แล้วปล่อยใจให้ล่องลอยอย่างเงียบงันไปสู่โลกแห่งควอเลียที่พวกเขาอาศัยอยู่",
    "เจ้าของร้าน Masala Kitchen: ชิโนบุ มิตสึจิ"
  ],
  "vi": [
    "MORPHOSPACE là gì?",
    "Nếu vị ngọt có hình dạng thì sao?\nNếu hương thơm sống dậy và chuyển động như một sinh vật thì sao?",
    "MORPHOSPACE là một phòng thí nghiệm khám phá những cảm giác được gợi lên từ vị giác và hương thơm dưới hình hài các sinh vật ba chiều.",
    "“Morpho” có nghĩa là hình dạng, còn “space” là không gian. Ở đây, đó là không gian của những khả năng, nơi những hình thể chưa từng thấy có thể ra đời.",
    "Những sinh vật ẩn trong qualia",
    "Độ tròn đầy của vị ngọt, nét sắc của vị chua, chiều sâu của vị đắng. Những phẩm chất chủ quan của cảm giác mà ngôn từ và con số không thể diễn tả trọn vẹn được gọi là “qualia”.",
    "Trong thế giới này, chúng tôi dựa vào các cảm giác ấy để tưởng tượng nên sinh vật qua màu sắc, hoa văn, bộ khung, kết cấu và chuyển động. Cùng một hình dạng nhưng mỗi người có thể cảm nhận khác nhau.",
    "Chỉ đơn giản là đang sống",
    "Giữa khoảng không trống rỗng, một sinh vật đơn độc.",
    "Nếu lắng tai, bạn có thể nghe thấy nhịp tim khe khẽ. Những hoa văn trên cơ thể chuyển động, ánh sáng chớp tắt như thể nó đang muốn nói với ai đó.",
    "Một cuộc gặp gỡ chỉ có một lần. Một sinh mệnh duy nhất trong vũ trụ.",
    "Không vì ai, cũng chẳng vì mục đích gì.\nChỉ ở đó, chỉ đơn giản là đang sống.",
    "Bạn không cần cố gắng hiểu điều gì.",
    "Chỉ cần lặng ngắm chúng và lắng nghe tiếng nói của chúng.",
    "Rồi để tâm trí nhẹ nhàng phiêu du vào thế giới qualia nơi chúng ẩn mình.",
    "Chủ quán Masala Kitchen: Shinobu Mitsuji"
  ],
  "pt": [
    "O que é MORPHOSPACE?",
    "E se a doçura tivesse uma forma?\nE se um aroma ganhasse vida como uma criatura?",
    "MORPHOSPACE é um laboratório que explora as sensações evocadas pelo sabor e pelo aroma na forma de seres vivos tridimensionais.",
    "«Morpho» significa forma e «space» significa espaço. Aqui, o nome sugere um campo de possibilidades onde podem nascer formas nunca antes vistas.",
    "Criaturas escondidas nas qualia",
    "A redondeza do doce, a agudeza do ácido, a profundidade do amargo. As qualidades subjetivas das sensações, que palavras e números não conseguem transmitir por completo, chamam-se «qualia».",
    "Neste mundo, essas sensações inspiram criaturas imaginadas a partir de cores, padrões, esqueletos, texturas e movimentos. A mesma forma pode despertar sentimentos diferentes em cada pessoa.",
    "Simplesmente, estar vivo",
    "Num espaço vazio, uma única criatura solitária.",
    "Se escutarmos com atenção, ouviremos um batimento cardíaco suave. Padrões movem-se na sua superfície e luzes piscam, como se tentasse falar com alguém.",
    "Um encontro único e irrepetível. Uma vida sem igual em todo o universo.",
    "Não existe por alguém, nem por algum propósito.\nEstá simplesmente ali, simplesmente viva.",
    "Não é preciso tentar compreender nada.",
    "Basta contemplar estes seres sem pressa e escutar as suas vozes.",
    "E deixar os pensamentos vaguearem, em silêncio, até ao mundo das qualia onde habitam.",
    "Proprietário do Masala Kitchen: Shinobu Mitsuji"
  ],
  "es": [
    "¿Qué es MORPHOSPACE?",
    "¿Y si la dulzura tuviera forma?\n¿Y si un aroma cobrara vida como una criatura?",
    "MORPHOSPACE es un laboratorio que explora las sensaciones evocadas por los sabores y aromas mediante seres vivos tridimensionales.",
    "«Morpho» significa forma y «space», espacio. Aquí, el nombre evoca un ámbito de posibilidades donde pueden surgir formas jamás vistas.",
    "Las criaturas ocultas en los qualia",
    "La redondez de lo dulce, el filo de lo ácido, la profundidad de lo amargo. A las cualidades subjetivas de la experiencia que las palabras y los números no alcanzan a transmitir las llamamos «qualia».",
    "En este mundo, esas sensaciones inspiran seres imaginarios creados mediante colores, patrones, esqueletos, texturas y movimientos. Una misma forma puede suscitar sensaciones diferentes en cada persona.",
    "Simplemente, estar vivo",
    "En un espacio vacío, una criatura completamente sola.",
    "Si escuchas con atención, quizá oigas el tenue latido de su corazón. Los dibujos de su cuerpo se agitan y las luces parpadean, como si intentara hablar con alguien.",
    "Un encuentro irrepetible. Una vida única en todo el universo.",
    "No existe para nadie ni para ningún propósito.\nSimplemente está ahí, simplemente vive.",
    "No hace falta tratar de comprender nada.",
    "Solo contempla a estos seres sin pensar en nada y escucha sus voces.",
    "Y deja que tus pensamientos viajen en silencio hacia el mundo de los qualia que habitan.",
    "Propietario de Masala Kitchen: Shinobu Mitsuji"
  ]
};
 const dialog=document.getElementById('aboutDialog');
 const control=document.getElementById('aboutLanguageControl');
 const select=document.getElementById('aboutLanguage');
 if(!dialog||!control||!select)return;
 const elements=KEYS.map(key=>dialog.querySelector('[data-about-key="'+key+'"]'));
 if(elements.some(node=>!node))return;
 const original=elements.map(node=>node.innerHTML);
 const originalLabels={dialog:dialog.getAttribute('aria-label')};
 const supported=new Set(['ja',...Object.keys(DICTIONARY)]);
 const storeKey='morphospace.about.language';
 function render(code){
  const language=supported.has(code)?code:'ja';
  const translated=language==='ja'?null:DICTIONARY[language];
  elements.forEach((node,i)=>{
   if(translated)node.textContent=translated[i];
   else node.innerHTML=original[i];
  });
  dialog.lang=language;
  select.value=language;
  try{window.localStorage.setItem(storeKey,language)}catch(_){}
 }
 select.addEventListener('change',()=>{render(select.value);dialog.querySelector('.about-document').scrollTop=0;});
 let initial='ja';
 try{initial=window.localStorage.getItem(storeKey)||'ja'}catch(_){}
 render(initial);
 control.hidden=false;
 window.MorphospaceAboutI18n=Object.freeze({languages:[...supported],render});
})();
