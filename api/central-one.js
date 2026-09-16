// ============================================
// 🎮 RECARGASGAMES - API CENTRAL ONE v3.3
// ============================================
// v3.3: AGREGADO FF Weekly (Semanal, Mensual, Booyah) al FREE FIRE
//       ELIMINADO Apex, Fortnite, Overwatch, LOL, FF Weekly aparte
// v3.2: AGREGADO Mobile Legends (55, 86, 112, 172, 257, 429, 706, 1050)
// v3.1: AGREGADO PUBG Mobile (WOW Coins + Prime Plus)
// Telegram con process.env (sin hardcodeo)
// ============================================

const BASE_URL = 'https://portal.centraloneglobal.com/api/v1';

// ============================================
// 📦 MAPA MAESTRO DE SKUs → UUIDs
// ============================================
const SKU_MAP = {
    // ============================================
    // 🔥 FREE FIRE (diamantes + membresías)
    // ============================================
    'FF-110-DIAMONDS':    'e7d8be5d-de17-4731-a3a0-9c6554c5ca78',
    'FF-341-DIAMONDS':    'bb0a8212-916e-4c9a-ad22-170fa9732734',
    'FF-572-DIAMONDS':    '0cbc02a5-2e65-41d3-899e-917abd1a2dd1',
    'FF-1166-DIAMONDS':   'afad588d-54f9-4227-9c0b-9889a9135370',
    'FF-2398-DIAMONDS':   '72b92180-b858-41fc-8e9d-bc402c16db80',
    'FF-6160-DIAMONDS':   'e839259e-79e5-474e-b6e8-0c83f876ac6a',
    'FF-WEEKLY-SEMANAL':  '47bba141-8980-47f7-b4bd-2e264c2d9930',
    'FF-WEEKLY-MENSUAL':  '6f98867c-a84e-418e-ab54-83f1da1fdee2',
    'FF-WEEKLY-BOOYAH':   '7eed3f72-b3fb-45e6-b8e5-9503e4aafcfa',

    // ============================================
    // ⚔️ BLOOD STRIKE
    // ============================================
    'BS-105':  'e4efc583-fcc4-4544-9547-8c687d663ba5',
    'BS-320':  '6a1d92fb-365c-4a9d-84df-492b954bad95',
    'BS-540':  '2c5dda92-ea2d-426c-b546-439ec433c8a7',
    'BS-1100': '0b024948-132f-4834-8bcb-57ffa75f1403',
    'BS-2260': 'b4671110-4eb6-421e-b428-26ea992f8f48',
    'BS-5800': '53df3770-de7f-4902-b78b-d0647c956fcb',

    // ============================================
    // 🎯 PUBG MOBILE (WOW Coins + Prime Plus)
    // ============================================
    'PUBG-60-WOW':      'e3a5f720-8a66-4ce3-8dd6-88141d539f2d',
    'PUBG-325-WOW':     '1b38e531-b2b7-4319-998b-4b6f4738f418',
    'PUBG-660-WOW':     'a5197d82-5b5d-4f8b-9850-e6d65b44bc1a',
    'PUBG-1800-WOW':    '85a09dd0-d45d-4a3c-a40f-e878d0f46cb2',
    'PUBG-3850-WOW':    '12de1a93-363a-45d3-8582-11d052a93665',
    'PUBG-8100-WOW':    '865240be-8624-4bfb-8cc9-a00402f859fd',
    'PUBG-WEEKLY-DEAL': 'f9df0a3a-a46d-4d9b-9c8f-be1a76ff9bc2',
    'PUBG-PRIME-1M':    '7171efcd-7ece-4f2a-b042-f27f8533a7dd',
    'PUBG-PRIME-3M':    '25f4a66d-26ed-471d-9ce9-c154007cebef',
    'PUBG-PRIME-6M':    'f6f6138f-07d0-40de-8ff7-745bb887aba6',
    'PUBG-PRIME-12M':   '8912c69e-468b-4c9f-993d-43d6b28c413c',
    'PUBG-ELITE-PASS':  '9f636584-3649-44ce-8d79-51260acccaa0',

    // ============================================
    // ⚔️ MOBILE LEGENDS (GLOBAL)
    // ============================================
    'ML-55':   '85e05010-7caa-4416-a8cf-8180f1cb8cf5',
    'ML-86':   '46f6116c-7bce-4251-aae7-90405beed7f6',
    'ML-112':  '0d0eac0a-a97d-4a93-9d42-1542d036dc61',
    'ML-172':  '98f7e381-8697-4201-8cfb-ef8813225946',
    'ML-257':  '45f573d5-6223-4bc0-9da6-eb6cf3bd64a8',
    'ML-429':  'c5001e7e-4b91-4793-bbb4-f1f2038e4081',
    'ML-706':  '4b4425c0-4525-496a-abdf-75708c9a503d',
    'ML-1050': '608bf79a-acb1-4ff8-bd67-63906d92c480',

    // ============================================
    // 🧱 ROBLOX (GIFT CARDS en Robux)
    // ============================================
    'RBX-50':    '20766524-e0b7-4da0-b31f-5ca5fb164c3e',
    'RBX-100':   '229a97b1-dfec-41a3-a287-c06c882db80e',
    'RBX-300':   '82308d57-2c4d-4271-9040-663e33a993f0',
    'RBX-360':   '5cafd861-3893-49a7-a9be-7815492c04c2',
    'RBX-420':   'f63a1845-5a51-42b1-b217-616964eaad71',
    'RBX-500':   '56c1daf9-22dc-49ac-9633-6d57548e213e',
    'RBX-555':   '9defafba-f584-4378-ab8c-ce656d2a7c7e',
    'RBX-700':   '7de07ab2-465c-4c26-8a28-626ebfa1cf13',
    'RBX-800':   '1418ad82-0ca5-47a3-bd1b-38de2f2b6e0b',
    'RBX-1000':  'd900d067-7f8a-427e-b128-9b64c91f65d0',
    'RBX-2000':  '898ed399-6901-4582-9755-e5299f7dfb40',
    'RBX-2500':  'f82d8920-a7e8-4ac2-942e-679ac565284c',
    'RBX-3000':  '2ef44f15-81a6-4a04-8f11-237cd6490789',
    'RBX-4500':  '6378c243-ad55-4c2d-9593-eee0da6ef4e7',
    'RBX-10000': '79fe3333-e8f3-4a96-b79c-b3acacc6fab5',

    // ============================================
    // 🔫 CALL OF DUTY MOBILE
    // ============================================
    'COD-115':   '8b6451b5-b60d-4f3e-8f1c-916612696d48',
    'COD-253':   '312e9583-3ed1-47bf-856a-60845ed56aea',
    'COD-529':   '355e83d1-2655-4557-9433-5f6eeade0025',
    'COD-794':   'd5bb6e8a-13fd-491c-9ef5-190a9c1293f0',
    'COD-1053':  '6ea20c6b-01b9-40be-8a37-d2a36456b00e',
    'COD-1323':  'c5646fb3-e35a-4b2e-81bc-84aa0431f701',
    'COD-2760':  'e0fca6c5-8ec1-4b15-b522-03d11254faec',
    'COD-6440':  'a50c16ac-335e-477a-bae2-38c686a8643f',
    'COD-9200':  'a2525435-3708-4ced-8e44-a28fc21615aa',
    'COD-12880': 'c9a8a960-dda8-4ba2-a58d-ba6f926c8373',
    'COD-15640': 'c67b54fd-c882-4f20-902d-c75725f7eb12',
    'COD-19320': '271dc36c-5e2e-4acd-83a1-3e2715f38c5a',

    // ============================================
    // 🎯 ARENA BREAKOUT (Bonds + Battle Passes)
    // ============================================
    'AB-66':          '4717ed5f-1a53-402d-b300-eca115c4b93a',
    'AB-335':         'a320c66a-04f4-458f-aa09-9aed14959ee1',
    'AB-675':         '27e6df12-f5b5-4804-acd6-cfe3f58bde8b',
    'AB-1690':        '9022d6c6-c732-4288-a830-3c9fd6214abd',
    'AB-3400':        'd2a86124-3342-4ba4-9623-642772628da4',
    'AB-6820':        'a5b759a8-0ccc-4ca2-95b8-6326fea4eb9c',
    'AB-BP-BEGINNER': '25637df5-abc5-4e71-96c6-5335141dae34',
    'AB-BP-ADV':      '0c3e488e-3666-431d-9676-44bb6c1bc43b',
    'AB-BP-PREM':     '1dc610a1-19a7-4cfd-abaf-79f1f7352a90',
    'AB-BP-PREM3M':   'ae006899-d9a5-424f-b5c8-af965ee61362',

    // ============================================
    // 💥 DELTA FORCE
    // ============================================
    'DF-60':    'e0ff073e-4668-433c-b96e-8ce7c0df4be9',
    'DF-320':   'a10c6c07-3baf-445a-ab68-6229a07b073b',
    'DF-750':   'd92a09a6-d96d-42cd-a5c1-75ff56896730',
    'DF-1480':  '85cf6d19-4589-4321-953b-c6a5758050c6',
    'DF-1980':  '7f5c9c92-e88d-4609-997a-848103ab9d9b',
    'DF-3950':  '881a5bb7-1e6f-4e5b-ba89-012b2ad55830',
    'DF-8100':  'ee0eab5c-14aa-48ea-a8f9-0b9ab1dc8b98',
    'DF-SP-OPS': '68861512-6043-4c50-bd1e-e77178ccb03f',
    'DF-SP-WAR': '70a63345-0c33-4a24-a117-39cee4084c27',
    'DF-SP-DLX': '6d273271-9d52-42c1-b6fc-d4a1eebefc02',

    // ============================================
    // 🎮 BIGO LIVE (Diamantes)
    // ============================================
    'BIGO-100':  '80f84262-372b-4e71-8df9-a3f9f75ad4da',
    'BIGO-500':  'd5a22f8a-e039-4bc5-84a6-b2d74dcc6e61',
    'BIGO-1000': '0357c579-a20b-4fe2-bbdd-35742c429c0c',
    'BIGO-10000': '53bea902-d838-4c33-87f7-2dc637cc9820',

    // ============================================
    // 🎁 GIFT CARDS - PLAYSTATION US
    // ============================================
    'PSN-5':   '15934f99-e566-4c30-887b-28a99f477b13',
    'PSN-10':  'c30917c6-b1f2-49b1-926a-2a3eaa374e7c',
    'PSN-15':  '5e0aa982-d972-41c5-830e-47d8b6b13a7e',
    'PSN-20':  '9ee21c38-433e-4409-bc15-a2bedc730608',
    'PSN-25':  'b11c9eb9-89fc-4335-b998-3a757038da76',
    'PSN-30':  'b525c041-c560-4fa3-80e8-9aa4d4f01550',
    'PSN-35':  'd39d8a6e-7f5e-48fc-baad-7ff62b4766f5',
    'PSN-40':  '9857fc31-e797-4f00-94f7-e61b5d273f64',
    'PSN-45':  'b8061a4f-f500-4da2-80d2-91b0a8d56eed',
    'PSN-50':  '5f37d450-03a8-45fe-9c68-c2c9e226f1a7',
    'PSN-75':  '7fa4c586-17e3-4c7d-9acd-a3b50e210fd4',
    'PSN-100': '4150d5b1-014c-4019-98f0-ab1fcb1ea645',

    // ============================================
    // 🎁 GIFT CARDS - XBOX US
    // ============================================
    'XBOX-1':   'e8cba797-a7ba-4c6c-8fbd-6a4b5b18b8ed',
    'XBOX-10':  '44bfddeb-e545-46ca-91ec-74eb58943cc7',
    'XBOX-15':  '3dfe654b-f678-49bf-b928-c794c6509bb4',
    'XBOX-20':  '29874d8d-a346-41a1-a19d-1a435f58e0cf',
    'XBOX-25':  '29874d8d-a346-41a1-a19d-1a435f58e0cf',
    'XBOX-50':  '29874d8d-a346-41a1-a19d-1a435f58e0cf',
    'XBOX-100': 'd60be4c3-fb96-4876-9f65-baeaf402b74f',

    // ============================================
    // 🎁 GIFT CARDS - NINTENDO US
    // ============================================
    'NINTENDO-10': 'f28a4f1b-617c-4b6a-814e-1263a91da6f5',
    'NINTENDO-20': '28d38620-68fc-4720-8e2f-586718f68e2b',
    'NINTENDO-50': '092cce7c-83e5-42a9-b1d6-20978f81f6db',
    'NINTENDO-100':'092cce7c-83e5-42a9-b1d6-20978f81f6db',

    // ============================================
    // 🎁 GIFT CARDS - NETFLIX US
    // ============================================
    'NETFLIX-15':  '676095be-084e-483b-a1c4-9354d5e8c1cf',
    'NETFLIX-20':  '576d3a32-2907-4785-85df-34c2cdfcbeca',
    'NETFLIX-25':  '2cfba5f9-1249-4184-8e11-09c21be5eb8f',
    'NETFLIX-30':  'f6e9891b-8f26-4a0f-a86d-8880791c749b',
    'NETFLIX-50':  '5c2d037d-e60f-4419-9d9a-d98ca41a267a',
    'NETFLIX-60':  'd30bf0cf-fdb0-4dee-adf2-1e7cb638206a',
    'NETFLIX-75':  '37f2e499-708d-4679-b477-449dfff949f1',
    'NETFLIX-100': '316183ea-7636-47e1-a323-14ccfce36edc',

    // ============================================
    // 🎁 GIFT CARDS - GOOGLE PLAY (EU/UK)
    // ============================================
    'GPLAY-10-EUR-DE': '9a71fdad-c577-4363-9322-eb598c42ce21',
    'GPLAY-15-EUR-ES': 'a49ce5ec-6d69-4fc9-a8a1-8d1bae63cdd4',
    'GPLAY-10-GBP-UK': '289508d9-da39-4485-a7cf-a980abfd4d85',
    'GPLAY-100-GBP-UK':'2f5615b1-3644-4488-b376-b68f04ac7bd7',

    // ============================================
    // 🎁 GIFT CARDS - ROBLOX (USD)
    // ============================================
    'ROBLOX-5':   '3dc289ce-5fff-4119-93e8-c5b6b7fe58c1',
    'ROBLOX-10':  'cacea4e9-e6f4-4850-834b-7d1cb6c2f99f',
    'ROBLOX-15':  '97f2b05a-d443-4c1b-a9e6-d254e487519a',
    'ROBLOX-20':  '9ba01138-7547-467b-91c8-15829a4d3bc7',
    'ROBLOX-25':  '947a609f-7333-4d6b-a37e-f03f4f795ea6',
    'ROBLOX-30':  '91ec5b7d-aa96-4c68-8d85-ca0d8fbd7a30',
    'ROBLOX-50':  '6a210046-93f7-4b41-9cd2-bb9b7907ad78',
    'ROBLOX-75':  'f3fc40c8-afad-40e2-b6ff-70e3b206e3c2',
    'ROBLOX-100': '746f9cf2-da4c-47e1-8c63-1b9cccd0ae56'
};

// ============================================
// 🎯 PRECIOS DE VENTA (margen sobre costo)
// ============================================
const MARGEN_JUEGOS = 1.20;
const MARGEN_GIFTCARDS = 1.10;
const MARGEN_STREAMING = 1.15;

// ============================================
// 📋 CONFIGURACIÓN DE PRODUCTOS
// ============================================
const PRODUCTOS_CONFIG = {
    // --- JUEGOS ---
    'FREE FIRE': {
        tipo: 'juego',
        input: ['id_jugador'],
        validar: /^\d{5,12}$/,
        paquetes: {
            // Diamantes
            '110':  'FF-110-DIAMONDS',
            '341':  'FF-341-DIAMONDS',
            '572':  'FF-572-DIAMONDS',
            '1166': 'FF-1166-DIAMONDS',
            '2398': 'FF-2398-DIAMONDS',
            '6160': 'FF-6160-DIAMONDS',
            // Tarjetas y Pases
            'weekly_semanal': 'FF-WEEKLY-SEMANAL',
            'weekly_mensual': 'FF-WEEKLY-MENSUAL',
            'weekly_booyah':  'FF-WEEKLY-BOOYAH'
        }
    },
    'BLOOD STRIKE': {
        tipo: 'juego',
        input: ['id_jugador'],
        validar: /^\d{8,12}$/,
        paquetes: {
            '105':  'BS-105',
            '320':  'BS-320',
            '540':  'BS-540',
            '1100': 'BS-1100',
            '2260': 'BS-2260',
            '5800': 'BS-5800'
        }
    },
    'PUBG MOBILE': {
        tipo: 'juego',
        input: ['id_jugador'],
        validar: /^\d{8,12}$/,
        paquetes: {
            '60':          'PUBG-60-WOW',
            '325':         'PUBG-325-WOW',
            '660':         'PUBG-660-WOW',
            '1800':        'PUBG-1800-WOW',
            '3850':        'PUBG-3850-WOW',
            '8100':        'PUBG-8100-WOW',
            'prime_1m':    'PUBG-PRIME-1M',
            'prime_3m':    'PUBG-PRIME-3M',
            'prime_6m':    'PUBG-PRIME-6M',
            'prime_12m':   'PUBG-PRIME-12M',
            'elite_pass':  'PUBG-ELITE-PASS'
        }
    },
    'MOBILE LEGENDS': {
        tipo: 'juego',
        input: ['id_jugador', 'zona_id'],
        validar: /^\d{8,15}$/,
        paquetes: {
            '55':   'ML-55',
            '86':   'ML-86',
            '112':  'ML-112',
            '172':  'ML-172',
            '257':  'ML-257',
            '429':  'ML-429',
            '706':  'ML-706',
            '1050': 'ML-1050'
        }
    },
    'COD': {
        tipo: 'juego',
        input: ['id_jugador'],
        validar: /^\d{8,15}$/,
        paquetes: {
            '115': 'COD-115', '253': 'COD-253', '529': 'COD-529',
            '794': 'COD-794', '1053': 'COD-1053', '1323': 'COD-1323',
            '2760': 'COD-2760', '6440': 'COD-6440', '9200': 'COD-9200',
            '12880': 'COD-12880', '15640': 'COD-15640', '19320': 'COD-19320'
        }
    },
    'ARENA BREAKOUT': {
        tipo: 'juego',
        input: ['id_jugador'],
        validar: /^\d{6,15}$/,
        paquetes: {
            '66': 'AB-66', '335': 'AB-335', '675': 'AB-675',
            '1690': 'AB-1690', '3400': 'AB-3400', '6820': 'AB-6820',
            'bp_beginner': 'AB-BP-BEGINNER',
            'bp_adv': 'AB-BP-ADV',
            'bp_prem': 'AB-BP-PREM',
            'bp_prem3m': 'AB-BP-PREM3M'
        }
    },
    'DELTA FORCE': {
        tipo: 'juego',
        input: ['id_jugador'],
        validar: /^\d{6,15}$/,
        paquetes: {
            '60': 'DF-60', '320': 'DF-320', '750': 'DF-750',
            '1480': 'DF-1480', '1980': 'DF-1980', '3950': 'DF-3950',
            '8100': 'DF-8100',
            'sp_ops': 'DF-SP-OPS', 'sp_war': 'DF-SP-WAR', 'sp_dlx': 'DF-SP-DLX'
        }
    },
    'BIGO LIVE': {
        tipo: 'juego',
        input: ['id_jugador'],
        validar: /^\d{6,15}$/,
        paquetes: {
            '100': 'BIGO-100', '500': 'BIGO-500',
            '1000': 'BIGO-1000', '10000': 'BIGO-10000'
        }
    },

    // --- GIFT CARDS ---
    'PLAYSTATION': {
        tipo: 'giftcard',
        input: ['email'],
        paquetes: {
            '5': 'PSN-5', '10': 'PSN-10', '15': 'PSN-15', '20': 'PSN-20',
            '25': 'PSN-25', '30': 'PSN-30', '35': 'PSN-35', '40': 'PSN-40',
            '45': 'PSN-45', '50': 'PSN-50', '75': 'PSN-75', '100': 'PSN-100'
        }
    },
    'XBOX': {
        tipo: 'giftcard',
        input: ['email'],
        paquetes: {
            '1': 'XBOX-1', '10': 'XBOX-10', '15': 'XBOX-15',
            '20': 'XBOX-20', '100': 'XBOX-100'
        }
    },
    'NINTENDO': {
        tipo: 'giftcard',
        input: ['email'],
        paquetes: {
            '10': 'NINTENDO-10', '20': 'NINTENDO-20',
            '50': 'NINTENDO-50', '100': 'NINTENDO-100'
        }
    },
    'NETFLIX': {
        tipo: 'giftcard',
        input: ['email'],
        paquetes: {
            '15': 'NETFLIX-15', '20': 'NETFLIX-20', '25': 'NETFLIX-25',
            '30': 'NETFLIX-30', '50': 'NETFLIX-50', '60': 'NETFLIX-60',
            '75': 'NETFLIX-75', '100': 'NETFLIX-100'
        }
    },
    'GOOGLE PLAY': {
        tipo: 'giftcard',
        input: ['email'],
        paquetes: {
            '10-eur-de': 'GPLAY-10-EUR-DE',
            '15-eur-es': 'GPLAY-15-EUR-ES',
            '10-gbp-uk': 'GPLAY-10-GBP-UK',
            '100-gbp-uk': 'GPLAY-100-GBP-UK'
        }
    },
    'ROBLOX': {
        tipo: 'giftcard',
        input: ['email'],
        paquetes: {
            '5': 'ROBLOX-5', '10': 'ROBLOX-10', '15': 'ROBLOX-15',
            '20': 'ROBLOX-20', '25': 'ROBLOX-25', '30': 'ROBLOX-30',
            '50': 'ROBLOX-50', '75': 'ROBLOX-75', '100': 'ROBLOX-100'
        }
    }
};

// ============================================
// 🎯 getUUID
// ============================================
function getUUID(juego, paquete) {
    const j = String(juego).toUpperCase().trim();
    const p = String(paquete);

    const config = PRODUCTOS_CONFIG[j];
    if (!config) return null;

    const sku = config.paquetes[p];
    if (!sku) return null;

    return SKU_MAP[sku] || null;
}

// ============================================
// ✅ VALIDACIÓN DE FORMATO
// ============================================
function validarID(juego, id) {
    const j = String(juego).toUpperCase().trim();
    const config = PRODUCTOS_CONFIG[j];

    if (!config || !config.validar) return true;

    if (config.tipo === 'giftcard') {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(id).trim());
    }

    return config.validar.test(String(id).trim());
}

// ============================================
// 📨 NOTIFICAR A TELEGRAM
// ============================================
async function notificarTelegram(mensaje) {
    try {
        const TG_TOKEN = process.env.TELEGRAM_TOKEN;
        const TG_CHAT = process.env.TELEGRAM_CHAT_ID;

        if (!TG_TOKEN || !TG_CHAT) {
            console.warn('⚠️ Telegram no configurado (faltan env vars)');
            return;
        }

        await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: TG_CHAT,
                text: mensaje,
                parse_mode: 'HTML'
            })
        });
    } catch (e) {
        console.error('⚠️ Error Telegram:', e.message);
    }
}

// ============================================
// 💰 CALCULAR PRECIO DE VENTA
// ============================================
function calcularPrecio(costoUSD, tipo) {
    const margen = tipo === 'giftcard' ? MARGEN_GIFTCARDS : MARGEN_JUEGOS;
    return (costoUSD * margen).toFixed(2);
}

// ============================================
// 🚀 HANDLER PRINCIPAL
// ============================================
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const API_KEY = process.env.CENTRAL_ONE_API_KEY;
        if (!API_KEY) {
            return res.status(500).json({ error: 'API Key no configurada' });
        }

        // ============================================
        // 📌 GET
        // ============================================
        if (req.method === 'GET') {
            const accion = req.query?.accion;

            if (accion === 'catalogo') {
                const r = await fetch(`${BASE_URL}/catalog`, {
                    headers: { 'Authorization': `Bearer ${API_KEY}` }
                });
                const data = await r.json();
                return res.status(r.status).json(data);
            }

            if (accion === 'juegos') {
                const juegos = Object.keys(PRODUCTOS_CONFIG).map(j => ({
                    nombre: j,
                    tipo: PRODUCTOS_CONFIG[j].tipo,
                    paquetes: Object.keys(PRODUCTOS_CONFIG[j].paquetes)
                }));
                return res.status(200).json({ juegos, total: juegos.length });
            }

            if (accion === 'verificar') {
                const { game, id } = req.query;
                if (!game || !id) {
                    return res.status(400).json({ error: 'Faltan parámetros' });
                }

                if (!validarID(game, id)) {
                    return res.status(400).json({
                        error: `Formato inválido para ${game}`,
                        valido: false
                    });
                }

                if (game.toUpperCase().includes('FREE FIRE')) {
                    const FF_TOKEN = process.env.FF_API_TOKEN;
                    if (FF_TOKEN) {
                        try {
                            const r = await fetch(`https://api.apicentral.pro/v1/freefire/check?user_id=${id}`, {
                                headers: { 'Authorization': `Bearer ${FF_TOKEN}` }
                            });
                            const data = await r.json();
                            return res.status(200).json({
                                valido: r.ok && data.status !== false,
                                nickname: data.nickname || null,
                                data
                            });
                        } catch (e) {
                            return res.status(200).json({ valido: true, nota: 'No se pudo verificar nickname' });
                        }
                    }
                }

                return res.status(200).json({ valido: true, nota: 'Formato correcto' });
            }

            if (accion === 'saldo') {
                const r = await fetch(`${BASE_URL}/balance`, {
                    headers: { 'Authorization': `Bearer ${API_KEY}` }
                });
                const data = await r.json();
                return res.status(r.status).json(data);
            }

            return res.status(200).json({
                mensaje: '✅ API Central One v3.3 funcionando',
                version: '3.3',
                acciones: ['catalogo', 'juegos', 'verificar', 'saldo'],
                total_productos: Object.keys(PRODUCTOS_CONFIG).length
            });
        }

        // ============================================
        // 📌 POST - RECARGA
        // ============================================
        if (req.method === 'POST') {
            const { accion, datos } = req.body || {};

            if (accion === 'recarga') {
                const { juego, id_jugador, paquete, email, servidor, zona_id } = datos || {};

                if (!juego || !paquete) {
                    return res.status(400).json({ error: 'Faltan datos (juego, paquete)' });
                }

                const config = PRODUCTOS_CONFIG[juego.toUpperCase()];
                if (!config) {
                    return res.status(400).json({ error: `Juego no soportado: ${juego}` });
                }

                const inputRequerido = config.tipo === 'giftcard' ? email : id_jugador;
                if (!inputRequerido) {
                    return res.status(400).json({
                        error: config.tipo === 'giftcard'
                            ? 'Falta email para gift card'
                            : 'Falta ID de jugador'
                    });
                }

                if (!validarID(juego, inputRequerido)) {
                    return res.status(400).json({
                        error: `Formato inválido para ${juego}`
                    });
                }

                const productId = getUUID(juego, paquete);
                if (!productId) {
                    return res.status(400).json({
                        error: `Paquete no encontrado: ${juego} - ${paquete}`
                    });
                }

                const juegoUpper = juego.toUpperCase();
                const idempotencyKey = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

                const payload = {
                    items: [{
                        catalog_item_id: productId,
                        quantity: 1
                    }],
                    note: `${juegoUpper} - ${config.tipo === 'giftcard' ? `Email: ${email}` : `ID: ${id_jugador}`} - Paquete: ${paquete}`
                };

                if (config.tipo === 'giftcard') {
                    payload.items[0].target_payload = { email: email };
                } else if (juegoUpper === 'MOBILE LEGENDS') {
                    payload.items[0].target_payload = {
                        player_id: id_jugador,
                        server: zona_id || servidor || '1'
                    };
                } else {
                    payload.items[0].target_payload = { player_id: id_jugador };
                }

                console.log(`🔄 Recarga ${juegoUpper} → ${inputRequerido} (${paquete})`);

                const r = await fetch(`${BASE_URL}/orders`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${API_KEY}`,
                        'Content-Type': 'application/json',
                        'Idempotency-Key': idempotencyKey
                    },
                    body: JSON.stringify(payload)
                });

                const data = await r.json();

                if (!r.ok) {
                    if (r.status === 409) {
                        if (data.error?.code === 'insufficient_balance') {
                            await notificarTelegram(
                                `⚠️ <b>SALDO INSUFICIENTE</b>\n🎮 ${juegoUpper}\n📦 ${paquete}\n🆔 ${inputRequerido}`
                            );
                            return res.status(409).json({ error: 'Saldo insuficiente', sinSaldo: true });
                        }
                        if (data.error?.code === 'insufficient_stock') {
                            return res.status(409).json({ error: 'Producto agotado', sinStock: true });
                        }
                    }
                    return res.status(r.status).json({
                        error: data.error?.message || 'Error en la recarga',
                        detalle: data
                    });
                }

                const orderId = data.order?.id;
                let codigos = [];

                if (config.tipo === 'giftcard' && orderId) {
                    const maxIntentos = 6;
                    let intento = 0;
                    while (intento < maxIntentos && codigos.length === 0) {
                        intento++;
                        await new Promise(r => setTimeout(r, 2500));
                        try {
                            const cr = await fetch(`${BASE_URL}/orders/${orderId}/codes`, {
                                headers: { 'Authorization': `Bearer ${API_KEY}` }
                            });
                            if (!cr.ok) continue;
                            const cd = await cr.json();
                            if (cd.order?.items?.length > 0) {
                                for (const it of cd.order.items) {
                                    if (it.codes?.length > 0) {
                                        codigos = it.codes;
                                        break;
                                    }
                                }
                            }
                        } catch (e) { /* continuar */ }
                    }
                }

                const status = data.order?.status || 'confirmed';
                const esExitosa = ['confirmed', 'completed', 'processing'].includes(status);
                const costo = parseFloat(data.order?.total_sale_amount || 0);
                const precioVenta = calcularPrecio(costo, config.tipo);

                const mensajeTG =
                    `🆕 <b>NUEVO PEDIDO - ${config.tipo === 'giftcard' ? 'GIFT CARD' : 'JUEGO'}</b>\n\n` +
                    `🎮 ${juegoUpper}\n` +
                    `📦 Paquete: ${paquete}\n` +
                    `🆔 ${config.tipo === 'giftcard' ? `Email: ${email}` : `ID: ${id_jugador}`}\n` +
                    `📋 Orden: ${orderId || 'N/A'}\n` +
                    `✅ Estado: ${status}\n` +
                    `💰 Costo: $${costo.toFixed(2)} USD\n` +
                    `💵 Venta: $${precioVenta} USD` +
                    (codigos.length > 0 ? `\n🎟️ <b>PIN:</b> <code>${codigos[0]}</code>` : '');

                await notificarTelegram(mensajeTG);

                return res.status(201).json({
                    exito: esExitosa,
                    mensaje: esExitosa
                        ? (config.tipo === 'giftcard' ? 'Gift Card generada ✅' : 'Recarga exitosa ✅')
                        : 'Procesando ⏳',
                    id_solicitud: orderId,
                    referencia: data.order?.reference_code,
                    proveedor: 'Central One',
                    tipo: config.tipo,
                    monto: precioVenta,
                    moneda: 'USD',
                    estado: status,
                    codigos,
                    codigo: codigos.length > 0 ? codigos[0] : null
                });
            }

            return res.status(400).json({ error: 'Acción no válida' });
        }

        return res.status(405).json({ error: 'Método no permitido' });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({
            error: 'Error interno',
            detalle: error.message
        });
    }
}
