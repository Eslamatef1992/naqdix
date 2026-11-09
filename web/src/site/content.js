// Website text, English and Arabic. Prices and plan features come from the admin panel.
const en = {
  nav: { modules: 'Solutions', android: 'Android POS', pricing: 'Pricing', faq: 'FAQ', demo: 'Request a demo', other: 'العربية' },
  hero: {
    title: 'The point of sale that keeps up with your store',
    body: 'Naqdi X runs your counter, stock, customers and reports in one place. Built for shops, supermarkets and chains in Kuwait and the Gulf, in Arabic and English.',
    primary: 'See plans', secondary: 'Request a demo',
    facts: ['Arabic and English receipts', 'KNET, card and cash', 'Works offline'],
  },
  receipt: {
    store: 'Al Noor Market', branch: 'Salmiya branch',
    items: [['Laban 1L', 2, 0.6], ['Basmati rice 5kg', 1, 2.95], ['Dates, box', 1, 3.5], ['Olive oil 500ml', 1, 1.85]],
    total: 'Total', paid: 'PAID · KNET', thanks: 'Thank you for shopping with us',
  },
  modules: {
    title: 'One system for every counter, shelf and branch',
    items: [
      { icon: 'register', title: 'Point of sale', body: 'Fast checkout with barcode scanning, split payments, returns and printed or WhatsApp receipts.' },
      { icon: 'box', title: 'Inventory', body: 'Live stock for every item and branch, low-stock alerts, stock counts and purchase orders.' },
      { icon: 'heart', title: 'Customers and loyalty', body: 'Know your regulars. Points, customer history and balances, right at the counter.' },
      { icon: 'tag', title: 'Promotions', body: 'Discounts, bundles and happy-hour prices that start and stop on their own.' },
      { icon: 'chart', title: 'Reports', body: 'Sales by hour, item, cashier and branch. Daily Z-report and profit per product.' },
      { icon: 'branches', title: 'Multi-branch', body: 'Prices, products and stock transfers controlled from one dashboard.' },
    ],
  },
  android: {
    title: 'POS Application for Android',
    lead: 'Turn an Android handheld or tablet into a full point of sale. One payment, no monthly fee.',
    once: 'One full payment', buy: 'Buy the Android app', more: 'See all features',
    how: 'How it works', steps: ['Pay online by card or PayPal', 'Receive your personal serial code instantly', 'Send the code to our team and we set up and activate your app'],
    devices: 'Works on Android 8 and newer, including handheld POS terminals with a built-in printer.',
  },
  industries: {
    title: 'Made for the way Gulf retail works',
    items: [['cart', 'Supermarkets'], ['shirt', 'Fashion'], ['phone', 'Mobile and electronics'], ['pill', 'Pharmacies'], ['cup', 'Cafés and bakeries'], ['flower', 'Perfumes'], ['gem', 'Jewelry and gold'], ['gift', 'Gifts and toys']],
  },
  integrations: {
    title: 'Connects to what you already use',
    body: 'Payment terminals, online stores, WhatsApp and your accounting, all talking to the same stock and sales.',
    items: ['KNET terminals', 'Visa / Mastercard', 'Shopify', 'WooCommerce', 'WhatsApp receipts', 'Accounting and ERP', 'Barcode scanners', 'Receipt printers'],
  },
  pricing: {
    title: 'Two plans, one yearly price',
    body: 'One yearly subscription per store, with updates and support included. Move up to Multi Branch any time.',
    monthly: 'Monthly', yearly: 'Yearly', save: '2 months free',
    perMonth: '/ month', perYear: '/ year', choose: 'Choose', popular: 'Most popular',
    note: 'Prices in KWD. Card and PayPal payments are charged in USD at the current rate.',
  },
  faq: {
    title: 'Questions retailers ask us',
    items: [
      ['Do I need an internet connection?', 'No. Sales keep working offline and everything syncs as soon as the connection is back.'],
      ['Which devices does it run on?', 'Windows PCs, tablets and Android handheld POS terminals. Receipt printers, cash drawers and barcode scanners plug straight in.'],
      ['How does the Android app activation work?', 'After you pay, you receive a personal serial code on screen and by email. Send it to our team on WhatsApp and we set up the app with your store details and activate it.'],
      ['Can I pay with KNET?', 'Online checkout accepts Visa, Mastercard and PayPal. For KNET or bank transfer, request a demo and our team will send you a payment link.'],
      ['Can I move my products from my old system?', 'Yes. Send us an Excel or CSV file and we import your products, prices and stock for you.'],
    ],
  },
  demo: {
    title: 'See Naqdi X in your store',
    body: 'Tell us about your business and we will call you to arrange a free demo.',
    name: 'Your name', company: 'Store name', phone: 'Phone / WhatsApp', email: 'Email (optional)', interest: 'Interested in',
    interests: [['plans', 'POS plans'], ['android', 'Android POS app'], ['hardware', 'POS hardware'], ['other', 'Something else']],
    message: 'Message (optional)', send: 'Request a demo', sent: 'Thank you! We will call you shortly.',
  },
  footer: { blurb: 'Smarter POS. Stronger business. Point of sale solutions for retail in Kuwait and the Gulf.', contact: 'Contact', product: 'Product', rights: 'All rights reserved.', whatsapp: 'Chat on WhatsApp' },
  checkout: {
    title: 'Checkout', yourDetails: 'Your details', name: 'Full name', company: 'Store or company (optional)', email: 'Email', phone: 'Phone / WhatsApp',
    summary: 'Order summary', billed: { monthly: 'Billed monthly', yearly: 'Billed yearly', once: 'One full payment' },
    card: 'Pay with Visa / Mastercard', paypal: 'Pay with PayPal', secure: 'You will complete the payment securely on PayPal, shown as Naqdi X.',
    converted: 'Charged as {amount} (converted from {original}).', notReady: 'Online payment is not switched on yet. Request a demo and we will send you a payment link.',
    serialNote: 'After paying you receive your serial activation code straight away.', terms: 'By paying you agree to our terms of sale.',
  },
  order: {
    title: 'Order {number}', paid: 'Payment confirmed', pending: 'Waiting for payment', canceled: 'Order canceled',
    thanks: 'Thank you, {name}. A receipt was sent to your email.',
    serial: 'Your activation serial code', serialHelp: 'Send this code to the Naqdi X team. We set up your app with your store details and activate it.',
    sendCode: 'Send the code on WhatsApp', copy: 'Copy', copied: 'Copied',
    activeUntil: 'Active until {date}', renew: 'Renew plan', planNext: 'Our team will contact you to set up your system.',
    payNow: 'Pay now', check: 'I already paid', notConfirmed: 'Your payment is not confirmed yet. If you completed it, press "I already paid" in a minute.',
    canceledPay: 'The payment was canceled. You can try again.', back: 'Back to Naqdi X', product: 'Product', amount: 'Amount', date: 'Date',
    waMessage: 'Hello Naqdi X, here is my serial code {serial} for order {number}.',
  },
};

const ar = {
  nav: { modules: 'الحلول', android: 'تطبيق أندرويد', pricing: 'الأسعار', faq: 'الأسئلة', demo: 'اطلب عرضاً تجريبياً', other: 'English' },
  hero: {
    title: 'نقطة بيع تواكب متجرك',
    body: 'نقدي إكس يدير الكاشير والمخزون والعملاء والتقارير في مكان واحد. مصمم للمحلات والسوبرماركت والسلاسل في الكويت والخليج، بالعربية والإنجليزية.',
    primary: 'شاهد الباقات', secondary: 'اطلب عرضاً تجريبياً',
    facts: ['إيصالات بالعربية والإنجليزية', 'كي نت وبطاقات ونقداً', 'يعمل دون إنترنت'],
  },
  receipt: {
    store: 'سوق النور', branch: 'فرع السالمية',
    items: [['لبن 1 لتر', 2, 0.6], ['أرز بسمتي 5 كغ', 1, 2.95], ['تمر، علبة', 1, 3.5], ['زيت زيتون 500 مل', 1, 1.85]],
    total: 'الإجمالي', paid: 'مدفوع · كي نت', thanks: 'شكراً لتسوقكم معنا',
  },
  modules: {
    title: 'نظام واحد لكل كاشير ورف وفرع',
    items: [
      { icon: 'register', title: 'نقطة البيع', body: 'دفع سريع بقراءة الباركود، وتقسيم الدفع، والمرتجعات، وإيصالات مطبوعة أو عبر واتساب.' },
      { icon: 'box', title: 'المخزون', body: 'مخزون لحظي لكل صنف وفرع، وتنبيهات النقص، والجرد، وأوامر الشراء.' },
      { icon: 'heart', title: 'العملاء والولاء', body: 'اعرف عملاءك الدائمين. نقاط وسجل مشتريات وأرصدة أمامك على الكاشير.' },
      { icon: 'tag', title: 'العروض', body: 'خصومات وباقات وأسعار مؤقتة تبدأ وتنتهي تلقائياً.' },
      { icon: 'chart', title: 'التقارير', body: 'المبيعات حسب الساعة والصنف والكاشير والفرع، وتقرير الإغلاق اليومي، والربح لكل منتج.' },
      { icon: 'branches', title: 'تعدد الفروع', body: 'الأسعار والمنتجات وتحويل المخزون من لوحة تحكم واحدة.' },
    ],
  },
  android: {
    title: 'تطبيق نقاط البيع على أندرويد',
    lead: 'حوّل جهاز أندرويد محمولاً أو تابلت إلى نقطة بيع كاملة. دفعة واحدة بدون رسوم شهرية.',
    once: 'دفعة كاملة واحدة', buy: 'اشترِ تطبيق أندرويد', more: 'كل المزايا',
    how: 'كيف يعمل', steps: ['ادفع إلكترونياً بالبطاقة أو PayPal', 'استلم رمزك التسلسلي الخاص فوراً', 'أرسل الرمز لفريقنا ونجهّز تطبيقك ونفعّله'],
    devices: 'يعمل على أندرويد 8 فما فوق، بما في ذلك أجهزة نقاط البيع المحمولة ذات الطابعة المدمجة.',
  },
  industries: {
    title: 'مصمم لطريقة عمل التجزئة في الخليج',
    items: [['cart', 'السوبرماركت'], ['shirt', 'الأزياء'], ['phone', 'الهواتف والإلكترونيات'], ['pill', 'الصيدليات'], ['cup', 'المقاهي والمخابز'], ['flower', 'العطور'], ['gem', 'المجوهرات والذهب'], ['gift', 'الهدايا والألعاب']],
  },
  integrations: {
    title: 'يتصل بما تستخدمه بالفعل',
    body: 'أجهزة الدفع والمتاجر الإلكترونية وواتساب وأنظمة المحاسبة، كلها مرتبطة بنفس المخزون والمبيعات.',
    items: ['أجهزة كي نت', 'Visa / Mastercard', 'Shopify', 'WooCommerce', 'إيصالات واتساب', 'المحاسبة وERP', 'قارئات الباركود', 'طابعات الإيصالات'],
  },
  pricing: {
    title: 'باقتان بسعر سنوي واحد',
    body: 'اشتراك سنوي واحد لكل متجر، يشمل التحديثات والدعم. انتقل إلى باقة الفروع المتعددة في أي وقت.',
    monthly: 'شهري', yearly: 'سنوي', save: 'شهران مجاناً',
    perMonth: '/ شهرياً', perYear: '/ سنوياً', choose: 'اختر', popular: 'الأكثر طلباً',
    note: 'الأسعار بالدينار الكويتي. الدفع بالبطاقة أو PayPal يُحتسب بالدولار حسب السعر الحالي.',
  },
  faq: {
    title: 'أسئلة يطرحها أصحاب المتاجر',
    items: [
      ['هل أحتاج اتصالاً بالإنترنت؟', 'لا. البيع يستمر دون إنترنت وتتزامن البيانات فور عودة الاتصال.'],
      ['على أي أجهزة يعمل؟', 'أجهزة ويندوز والتابلت وأجهزة نقاط البيع المحمولة بنظام أندرويد. وتعمل معه طابعات الإيصالات وأدراج النقد وقارئات الباركود مباشرة.'],
      ['كيف يتم تفعيل تطبيق أندرويد؟', 'بعد الدفع تستلم رمزاً تسلسلياً خاصاً على الشاشة وعبر البريد. أرسله لفريقنا على واتساب ونجهّز التطبيق ببيانات متجرك ونفعّله.'],
      ['هل يمكنني الدفع بالكي نت؟', 'الدفع الإلكتروني يقبل فيزا وماستركارد وPayPal. وللدفع بالكي نت أو التحويل البنكي اطلب عرضاً وسيرسل لك فريقنا رابط الدفع.'],
      ['هل يمكن نقل منتجاتي من نظامي القديم؟', 'نعم. أرسل لنا ملف Excel أو CSV ونستورد المنتجات والأسعار والمخزون عنك.'],
    ],
  },
  demo: {
    title: 'شاهد نقدي إكس في متجرك',
    body: 'أخبرنا عن نشاطك وسنتصل بك لترتيب عرض تجريبي مجاني.',
    name: 'الاسم', company: 'اسم المتجر', phone: 'الهاتف / واتساب', email: 'البريد الإلكتروني (اختياري)', interest: 'مهتم بـ',
    interests: [['plans', 'باقات نقاط البيع'], ['android', 'تطبيق أندرويد'], ['hardware', 'أجهزة نقاط البيع'], ['other', 'أمر آخر']],
    message: 'رسالة (اختياري)', send: 'اطلب عرضاً تجريبياً', sent: 'شكراً لك! سنتصل بك قريباً.',
  },
  footer: { blurb: 'نقاط بيع أذكى. أعمال أقوى. حلول نقاط البيع للتجزئة في الكويت والخليج.', contact: 'تواصل معنا', product: 'المنتج', rights: 'جميع الحقوق محفوظة.', whatsapp: 'تحدث معنا على واتساب' },
  checkout: {
    title: 'إتمام الطلب', yourDetails: 'بياناتك', name: 'الاسم الكامل', company: 'المتجر أو الشركة (اختياري)', email: 'البريد الإلكتروني', phone: 'الهاتف / واتساب',
    summary: 'ملخص الطلب', billed: { monthly: 'يُدفع شهرياً', yearly: 'يُدفع سنوياً', once: 'دفعة كاملة واحدة' },
    card: 'ادفع بفيزا / ماستركارد', paypal: 'ادفع عبر PayPal', secure: 'ستكمل الدفع بأمان على PayPal باسم Naqdi X.',
    converted: 'يُخصم مبلغ {amount} (محوّلاً من {original}).', notReady: 'الدفع الإلكتروني غير مفعّل بعد. اطلب عرضاً وسنرسل لك رابط الدفع.',
    serialNote: 'بعد الدفع تستلم رمز التفعيل التسلسلي فوراً.', terms: 'بإتمام الدفع فإنك توافق على شروط البيع.',
  },
  order: {
    title: 'الطلب {number}', paid: 'تم تأكيد الدفع', pending: 'بانتظار الدفع', canceled: 'تم إلغاء الطلب',
    thanks: 'شكراً لك يا {name}. أرسلنا الإيصال إلى بريدك.',
    serial: 'رمز التفعيل التسلسلي', serialHelp: 'أرسل هذا الرمز إلى فريق نقدي إكس. نجهّز تطبيقك ببيانات متجرك ونفعّله.',
    sendCode: 'أرسل الرمز عبر واتساب', copy: 'نسخ', copied: 'تم النسخ',
    activeUntil: 'فعّالة حتى {date}', renew: 'جدد الباقة', planNext: 'سيتواصل معك فريقنا لتجهيز نظامك.',
    payNow: 'ادفع الآن', check: 'دفعت بالفعل', notConfirmed: 'لم يتم تأكيد الدفع بعد. إذا أكملته اضغط "دفعت بالفعل" بعد دقيقة.',
    canceledPay: 'تم إلغاء الدفع. يمكنك المحاولة مجدداً.', back: 'العودة إلى نقدي إكس', product: 'المنتج', amount: 'المبلغ', date: 'التاريخ',
    waMessage: 'مرحباً نقدي إكس، هذا رمزي التسلسلي {serial} للطلب {number}.',
  },
};

export const content = { en, ar };
export const fill = (s, vars = {}) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
