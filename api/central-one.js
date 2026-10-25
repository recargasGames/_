// ============================================
// 🎮 RECARGASGAMES - API CENTRAL ONE v6.9
// ============================================
// v6.9: MENSAJE DE TELEGRAM FORMATO EXACTO (FOTO)
// ============================================

import { createHmac, timingSafeEqual } from "node:crypto";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

let dbAdmin = null;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        if (!getApps().length) {
            initializeApp({
                credential: cert(serviceAccount),
                databaseURL: "https://free-52119-default-rtdb.asia-southeast1.firebasedatabase.app"
            });
        }
        dbAdmin = getDatabase();
    } else {
        console.warn("⚠️ FIREBASE_SERVICE_ACCOUNT no configurado.");
    }
} catch (error) {
    console.error("❌ Error inicializando Firebase Admin:", error.message);
}

const BASE_URL = 'https://portal.centraloneglobal.com/api/v1';

const SKU_MAP = {
    // FREE FIRE LATAM
    'FF-110-DIAMONDS':    'e7d8be5d-de17-4731-a3a0-9c6554c5ca78',
    'FF-341-DIAMONDS':    'bb0a8212-916e-4c9a-ad22-170fa9732734',
    'FF-572-DIAMONDS':    '0cbc02a5-2e65-41d3-899e-917abd1a2dd1',
    'FF-1166-DIAMONDS':   'afad588d-54f9-4227-9c0b-9889a9135370',
    'FF-2398-DIAMONDS':   '72b92180-b858-41fc-8e9d-bc402c16db80',
    'FF-6160-DIAMONDS':   'e839259e-79e5-474e-b6e8-0c83f876ac6a',
    'FF-WEEKLY-SEMANAL':  '47bba141-8980-47f7-b4bd-2e264c2d9930',
    'FF-WEEKLY-MENSUAL':  '6f98867c-a84e-418e-ab54-83f1da1fdee2',
    'FF-WEEKLY-BOOYAH':   '7eed3f72-b3fb-45e6-b8e5-9503e4aafcfa',
    'FF-NIVEL-17':        '00147efa-cc79-4767-8306-9b5dc45e2757',
    'FF-NIVEL-18':        '0d351e69-6360-42bc-9b83-94de2c26b4be',
    'FF-NIVEL-19':        '3e2b9bd8-2293-4bd4-8978-316603eec328',
    'FF-NIVEL-20':        '549739d0-f988-4d5d-9b18-5357bd8de9fa',
    'FF-NIVEL-21':        'a9093b52-a726-4e9d-be8d-994df6ccd870',
    'FF-NIVEL-22':        '5d18dc6d-98be-45c4-a472-68266f6a3c9d',
    // FREE FIRE BRASIL
    'FF-BR-110':          '89fec3da-b07a-4966-b322-2564967fa1eb',
    'FF-BR-341':          '949b4c7e-c37c-4b6f-836e-6760ab4c0121',
    'FF-BR-572':          'c290219c-30d8-44d3-981f-779422554f65',
    'FF-BR-1166':         '12ad5a47-2619-4624-84ee-ed1ab5cc9ab8',
    'FF-BR-2398':         '57e67fe2-abfd-4533-8037-c81b5799854d',
    'FF-BR-6160':         'a1f7abf0-91ed-4089-8174-db84c82ba6dc',
    'FF-BR-22640':        '2766a9db-01d0-4b14-8140-a88b055015b7',
    'FF-BR-SEMANAL':      '9c637ffc-d52a-4c8e-ba12-d3366d3ecef8',
    'FF-BR-MENSUAL':      '600bf5a0-1f20-482a-b50e-5acab1a14e9f',
    'FF-BR-SEMANAL-BAS':  '7badf2ad-fc46-41cb-9ea8-8a3c73d3c49a',
    'FF-BR-BOOYAH':       '7e7643a6-d1c2-40e0-a5ef-9dea06a9863b',
    'FF-BR-BOOYAH-PREM':  '7de9a2ec-3c07-4a45-abc2-4c5ced4065e7',
    'FF-BR-EVO-3D':       '9f101883-1262-4c12-914f-76b5b270ba43',
    'FF-BR-EVO-7D':       '6b9bfb24-6dc1-43cd-ad0a-e39513bbfdfc',
    'FF-BR-EVO-30D':      'd7c97e88-acdf-4721-b56f-90c76a80be24',
    'FF-BR-NIVEL-6':      '4c5b5a5c-d1dd-4225-9cba-0d595d8d1a34',
    'FF-BR-NIVEL-10':     '2ca9ed79-5a2c-4143-98f3-4bd09b62f449',
    'FF-BR-NIVEL-15':     '19b1e947-410e-4b7c-872c-a948535ce944',
    'FF-BR-NIVEL-20':     '301289dc-35bc-4102-bd56-1f8629567eb4',
    'FF-BR-NIVEL-25':     '66fda745-2421-4e7a-bbf7-1d063c10a181',
    'FF-BR-NIVEL-30':     'd32612d6-b1bf-43be-827b-c021d3eed2a6',
    // RACING MASTER
    'RM-LATAM-NOVICE':    '3ef9bea0-4b05-4a21-a559-b760bde2f9d2',
    'RM-LATAM-70':        'c531cdd1-b2ac-4822-8cd6-09ee3a4e2b95',
    'RM-LATAM-OUTFIT':    '27859c97-0828-44d4-86c3-e5624a6913db',
    'RM-LATAM-WEEKLY':    '838ce749-34e7-4014-b5e9-977651981187',
    'RM-LATAM-140':       '5ca1c7d4-46dc-494d-a6a9-bb96db026f7c',
    'RM-LATAM-MONTHLY':   '609249eb-c6d0-4059-b1dd-bb1e8fc4a290',
    'RM-LATAM-210':       'fdf8b563-c6e5-4025-b605-e05361ad6676',
    'RM-LATAM-350':       '9fc78e6c-cc6f-48a6-bb87-5dd8e8698578',
    'RM-LATAM-UPG-PREM':  'c309da99-79e4-4c99-bb5e-fce077c67eea',
    'RM-LATAM-DELUXE':    '7477edc6-2340-4fde-a4d8-2e4456b38834',
    'RM-LATAM-GROWTH':    '0c7d791d-d40b-4e68-92d4-ccf4f50cfba9',
    'RM-LATAM-700':       '0f462c23-4282-45bf-8271-acab79d24598',
    'RM-LATAM-PREM':      '93740fac-7faf-4ed3-8d03-dd83c7729879',
    'RM-LATAM-1000':      '1d55d833-d321-4285-bc51-9deaa29f9a12',
    'RM-LATAM-1400':      'ade3921b-5b11-41c6-bc1a-6af31f4010c5',
    'RM-LATAM-LEGEND':    '8f63dd15-9cbe-4ba0-b6a8-834f571210db',
    'RM-LATAM-2100':      'f6dff6cc-c31a-4a61-ba8a-8c33e5b3af9b',
    'RM-LATAM-UPG-MP':    'eef2bfb8-8c2c-4580-ab22-af2730a38891',
    'RM-LATAM-MP-BUNDLE': 'c47f744f-0872-4b05-b02d-00e5cfcf95b3',
    'RM-LATAM-3400':      'ba7e5654-f98c-4e95-aa4e-57f178130c47',
    'RM-LATAM-6600':      'db4d09b6-deea-4240-ad2c-81a965b04200',
    // SUPER SUS
    'SS-100':           '47ed9e26-f618-4fe8-9886-c2615c4f1153',
    'SS-128':           '6ea5a400-da18-40d3-957c-6bfbc12f8a00',
    'SS-WEEKLY':        '2ab78fd4-2b85-4285-8bda-4740db314c99',
    'SS-310':           'e0c5cf60-893a-4644-9194-9252bf2c4447',
    'SS-395':           '853a76ba-f133-47ce-87ca-b06846890ad3',
    'SS-1+1':           'ede0e118-b046-42a6-b7e4-74cde6a0b815',
    'SS-520':           '95c5bcc3-9720-4f1a-b0d5-c84b3e91d197',
    'SS-670':           '821a23b2-88ed-4c3d-bb62-751b6014e96f',
    'SS-SUPERPASS':     '8630e6d5-e155-4f67-8eb8-ccae8ef9ea55',
    'SS-1060':          'dc45a7b9-f703-4461-b0b0-8bddfe6327ed',
    'SS-1360':          '269a9f2b-5142-454d-95d2-7553184b8fcc',
    'SS-SUPERPASSB':    'e95a51a2-0976-4fef-b7a7-5fa7eab1b0f0',
    'SS-MONTHLY':       'af30e4d2-c15d-49f5-8bf6-b694b6d17bde',
    'SS-SUPERVIP':      '8fad2523-5bfd-45bd-8d4a-f45c90dafc95',
    'SS-2180':          '487c85a1-a7f7-45a6-8b95-d723b2cd6742',
    'SS-2760':          '8607efd3-5e94-48a8-b034-972c7be5e1b8',
    'SS-7000':          '00a4ef9b-62f3-4153-9a35-dae30b0af702',
    'SS-5600':          'b5632b1f-7e94-436b-a38d-0358efa11b99',
    // MARVEL RIVALS
    'MR-100':           'a25b3ea0-2ff9-4195-918a-162c734f0744',
    'MR-PICKUP':        '122c594d-7baf-4747-9910-f2007a756de9',
    'MR-500':           '34c0a4c4-5ae3-4daf-8d08-25625659d38f',
    'MR-1000':          '8a00965e-f336-42a0-af08-5eaa43a77912',
    'MR-2180':          '66e30ffb-8b1d-42c4-ade9-bf0ecff8c7b6',
    'MR-5680':          '9c8290df-b4e5-4ced-8cb2-7088361f3eb5',
    'MR-11680':         '751841ef-0e1e-4034-84a0-9899db5635e2',
    // HONOR OF KINGS
    'HOK-16':             '9f3817a2-a395-4324-b5c8-3c2aba407749',
    'HOK-DOUBLE-LUCKY':   '4dc4ffe1-0f8a-44a3-a717-97c2c4b0cf99',
    'HOK-80':             'c3aafd3f-f602-4e23-a015-1999c794cd79',
    'HOK-WEEKLY':         '7fa8144c-3452-4d81-a291-2e4c39409620',
    'HOK-400':            'b1a3edb1-dfc0-4e4c-a169-3156b1acf24f',
    'HOK-STANDARD-PACK':  '18eab674-ecb0-406b-ab9a-ef7e55bb5bbc',
    'HOK-HONOR-PACK':     'ead0c754-ca3c-4813-968d-a69328230f35',
    'HOK-INFERNAL':       '60735234-46a5-421b-98e8-cc3a17b3d9d1',
    'HOK-PREMIUM-PACK':   '553c7913-d234-4ab3-bea8-aa0c608d6b04',
    'HOK-240':            'f64fc207-ecb4-49c0-9d6c-6deff9502e91',
    'HOK-WEEKLY-PLUS':    '56883290-5ec5-4ee5-b207-7c6b4141cedc',
    'HOK-560':            '40bf2360-f948-4b86-a74b-798c839038c2',
    'HOK-830':            '37f5627c-d420-4870-89f3-7b7db358642a',
    'HOK-1245':           'e7ef6d3b-4b3d-450f-a891-a23d29b56b7f',
    'HOK-2508':           '1a04a619-71fd-4c9e-a883-b0ea8db37b1b',
    'HOK-4180':           '22ed6ce1-bf1f-4a80-8404-1d95ed4b5c71',
    'HOK-8360':           '3087b613-a926-4a39-8d73-804815d7cd51',
    // BLOOD STRIKE
    'BS-105':  'e4efc583-fcc4-4544-9547-8c687d663ba5',
    'BS-320':  '6a1d92fb-365c-4a9d-84df-492b954bad95',
    'BS-540':  '2c5dda92-ea2d-426c-b546-439ec433c8a7',
    'BS-1100': '0b024948-132f-4834-8bcb-57ffa75f1403',
    'BS-2260': 'b4671110-4eb6-421e-b428-26ea992f8f48',
    'BS-5800': '53df3770-de7f-4902-b78b-d0647c956fcb',
    // PUBG MOBILE
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
    // MOBILE LEGENDS
    'ML-55':   '85e05010-7caa-4416-a8cf-8180f1cb8cf5',
    'ML-86':   '46f6116c-7bce-4251-aae7-90405beed7f6',
    'ML-112':  '0d0eac0a-a97d-4a93-9d42-1542d036dc61',
    'ML-172':  '98f7e381-8697-4201-8cfb-ef8813225946',
    'ML-257':  '45f573d5-6223-4bc0-9da6-eb6cf3bd64a8',
    'ML-429':  'c5001e7e-4b91-4793-bbb4-f1f2038e4081',
    'ML-706':  '4b4425c0-4525-496a-abdf-75708c9a503d',
    'ML-1050': '608bf79a-acb1-4ff8-bd67-63906d92c480',
    // ROBLOX
    'RBX-50':    '81dfdc57-1feb-4e72-8be6-7e119a348c48',
    'RBX-100':   'ea9298ae-944b-498b-9d82-a8128624cbbd',
    'RBX-275':   '2ed3da74-e7e6-4c1b-a609-b630855303b6',
    'RBX-360':   '5cafd861-3893-49a7-a9be-7815492c04c2',
    'RBX-555':   '9defafba-f584-4378-ab8c-ce656d2a7c7e',
    'RBX-1000':  '586763f0-6a06-4f5b-9eaf-cb7f66ae2ce2',
    'RBX-2000':  '898ed399-6901-4582-9755-e5299f7dfb40',
    'RBX-2400':  '375a5a43-61f4-40c3-baf6-fc81f3bbe2bc',
    // COD MOBILE
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
    // ARENA BREAKOUT
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
    // DELTA FORCE
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
    // BIGO LIVE
    'BIGO-100':  '80f84262-372b-4e71-8df9-a3f9f75ad4da',
    'BIGO-500':  'd5a22f8a-e039-4bc5-84a6-b2d74dcc6e61',
    'BIGO-1000': '0357c579-a20b-4fe2-bbdd-35742c429c0c',
    'BIGO-10000': '53bea902-d838-4c33-87f7-2dc637cc9820',
    // GIFT CARDS
    'PSN-1':   '39ad5eef-234d-463e-a851-78d21f8ae217',
    'PSN-2':   '1f3ab10c-4a1c-4632-a883-f8989d251764',
    'PSN-3':   '1341b21e-72b5-4624-952e-d72511b2ae23',
    'PSN-4':   '869cdd6a-53e4-4c2c-93ab-6ba13534c318',
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
    'XBOX-1':   'e8cba797-a7ba-4c6c-8fbd-6a4b5b18b8ed',
    'XBOX-5':   'dfb2f11c-0a37-4369-ad30-bbd05796ce48',
    'XBOX-10':  '44bfddeb-e545-46ca-91ec-74eb58943cc7',
    'XBOX-15':  '3dfe654b-f678-49bf-b928-c794c6509bb4',
    'XBOX-20':  '29874d8d-a346-41a1-a19d-1a435f58e0cf',
    'XBOX-25':  '555e8d30-e771-4b38-acc0-4eaa9043db68',
    'XBOX-50':  'b48fbf26-1812-4d5e-9c9b-42d0bfecb5ad',
    'XBOX-100': 'd60be4c3-fb96-4876-9f65-baeaf402b74f',
    'NINTENDO-5':  '434fffe4-bcf0-4201-b770-c1533bafa5d1',
    'NINTENDO-10': 'f28a4f1b-617c-4b6a-814e-1263a91da6f5',
    'NINTENDO-20': '28d38620-68fc-4720-8e2f-586718f68e2b',
    'NINTENDO-35': '0ffdd977-d634-4555-945a-c8e3c4e95228',
    'NINTENDO-50': 'd9dfe5cb-3a64-45bf-a6e6-bf62a01165a3',
    'NINTENDO-70': 'd8b6fac2-edca-4625-ad77-ba8cbba82276',
    'NETFLIX-15':  '676095be-084e-483b-a1c4-9354d5e8c1cf',
    'NETFLIX-20':  '576d3a32-2907-4785-85df-34c2cdfcbeca',
    'NETFLIX-25':  '2cfba5f9-1249-4184-8e11-09c21be5eb8f',
    'NETFLIX-30':  'f6e9891b-8f26-4a0f-a86d-8880791c749b',
    'NETFLIX-50':  '5c2d037d-e60f-4419-9d9a-d98ca41a267a',
    'NETFLIX-60':  'd30bf0cf-fdb0-4dee-adf2-1e7cb638206a',
    'NETFLIX-75':  '37f2e499-708d-4679-b477-449dfff949f1',
    'NETFLIX-100': '316183ea-7636-47e1-a323-14ccfce36edc',
    'GPLAY-10-EUR-DE': '9a71fdad-c577-4363-9322-eb598c42ce21',
    'GPLAY-15-EUR-ES': 'a49ce5ec-6d69-4fc9-a8a1-8d1bae63cdd4',
    'GPLAY-10-GBP-UK': '289508d9-da39-4485-a7cf-a980abfd4d85',
    'GPLAY-100-GBP-UK':'2f5615b1-3644-4488-b376-b68f04ac7bd7'
};

const MARGEN_JUEGOS = 1.20;
const MARGEN_GIFTCARDS = 1.10;

const PRODUCTOS_CONFIG = {
    'FREE FIRE': { tipo:'juego', input:['id_jugador'], validar:/^\d{5,12}$/, paquetes:{
        '110':'FF-110-DIAMONDS','341':'FF-341-DIAMONDS','572':'FF-572-DIAMONDS',
        '1166':'FF-1166-DIAMONDS','2398':'FF-2398-DIAMONDS','6160':'FF-6160-DIAMONDS',
        'weekly_semanal':'FF-WEEKLY-SEMANAL','weekly_mensual':'FF-WEEKLY-MENSUAL','weekly_booyah':'FF-WEEKLY-BOOYAH',
        'nivel_6':'FF-NIVEL-17', 'nivel_10':'FF-NIVEL-18', 'nivel_15':'FF-NIVEL-19',
        'nivel_20':'FF-NIVEL-20', 'nivel_25':'FF-NIVEL-21', 'nivel_30':'FF-NIVEL-22'
    }},
    'FREE FIRE BR': { tipo:'juego', input:['id_jugador'], validar:/^\d{5,12}$/, paquetes:{
        '110':'FF-BR-110', '341':'FF-BR-341', '572':'FF-BR-572', 
        '1166':'FF-BR-1166', '2398':'FF-BR-2398', '6160':'FF-BR-6160', '22640':'FF-BR-22640',
        'weekly_semanal':'FF-BR-SEMANAL', 'weekly_mensual':'FF-BR-MENSUAL', 'weekly_basica':'FF-BR-SEMANAL-BAS',
        'weekly_booyah':'FF-BR-BOOYAH', 'weekly_booyah_prem':'FF-BR-BOOYAH-PREM',
        'evo_3d':'FF-BR-EVO-3D', 'evo_7d':'FF-BR-EVO-7D', 'evo_30d':'FF-BR-EVO-30D',
        'nivel_6':'FF-BR-NIVEL-6', 'nivel_10':'FF-BR-NIVEL-10', 'nivel_15':'FF-BR-NIVEL-15',
        'nivel_20':'FF-BR-NIVEL-20', 'nivel_25':'FF-BR-NIVEL-25', 'nivel_30':'FF-BR-NIVEL-30'
    }},
    'RACING MASTER': { tipo:'juego', input:['id_jugador'], validar:/^\d{5,15}$/, paquetes:{
        'novice':'RM-LATAM-NOVICE', '70':'RM-LATAM-70', 'outfit':'RM-LATAM-OUTFIT', 'weekly':'RM-LATAM-WEEKLY',
        '140':'RM-LATAM-140', 'monthly':'RM-LATAM-MONTHLY', '210':'RM-LATAM-210', '350':'RM-LATAM-350',
        'upg_prem':'RM-LATAM-UPG-PREM', 'deluxe':'RM-LATAM-DELUXE', 'growth':'RM-LATAM-GROWTH', '700':'RM-LATAM-700',
        'prem':'RM-LATAM-PREM', '1000':'RM-LATAM-1000', '1400':'RM-LATAM-1400', 'legend':'RM-LATAM-LEGEND',
        '2100':'RM-LATAM-2100', 'upg_mp':'RM-LATAM-UPG-MP', 'mp_bundle':'RM-LATAM-MP-BUNDLE',
        '3400':'RM-LATAM-3400', '6600':'RM-LATAM-6600'
    }},
    'SUPER SUS': { tipo:'juego', input:['id_jugador'], validar:/^\d{5,15}$/, paquetes:{
        '100':'SS-100', '128':'SS-128', 'weekly':'SS-WEEKLY', '310':'SS-310', '395':'SS-395',
        '1+1':'SS-1+1', '520':'SS-520', '670':'SS-670', 'superpass':'SS-SUPERPASS', '1060':'SS-1060',
        '1360':'SS-1360', 'superpassb':'SS-SUPERPASSB', 'monthly':'SS-MONTHLY', 'supervip':'SS-SUPERVIP',
        '2180':'SS-2180', '2760':'SS-2760', '7000':'SS-7000', '5600':'SS-5600'
    }},
    'MARVEL RIVALS': { tipo:'juego', input:['id_jugador'], validar:/^\d{5,15}$/, paquetes:{
        '100':'MR-100', 'pickup':'MR-PICKUP', '500':'MR-500', '1000':'MR-1000',
        '2180':'MR-2180', '5680':'MR-5680', '11680':'MR-11680'
    }},
    'HONOR OF KINGS': { tipo:'juego', input:['id_jugador'], validar:/^\d{5,15}$/, paquetes:{
        '16':'HOK-16', 'double_lucky':'HOK-DOUBLE-LUCKY', '80':'HOK-80', 'weekly':'HOK-WEEKLY', '400':'HOK-400',
        'standard_pack':'HOK-STANDARD-PACK', 'honor_pack':'HOK-HONOR-PACK', 'infernal':'HOK-INFERNAL',
        'premium_pack':'HOK-PREMIUM-PACK', '240':'HOK-240', 'weekly_plus':'HOK-WEEKLY-PLUS', '560':'HOK-560',
        '830':'HOK-830', '1245':'HOK-1245', '2508':'HOK-2508', '4180':'HOK-4180', '8360':'HOK-8360'
    }},
    'BLOOD STRIKE': { tipo:'juego', input:['id_jugador'], validar:/^\d{8,12}$/, paquetes:{
        '105':'BS-105','320':'BS-320','540':'BS-540','1100':'BS-1100','2260':'BS-2260','5800':'BS-5800'
    }},
    'PUBG MOBILE': { tipo:'juego', input:['id_jugador'], validar:/^\d{8,12}$/, paquetes:{
        '60':'PUBG-60-WOW','325':'PUBG-325-WOW','660':'PUBG-660-WOW',
        '1800':'PUBG-1800-WOW','3850':'PUBG-3850-WOW','8100':'PUBG-8100-WOW',
        'prime_1m':'PUBG-PRIME-1M','prime_3m':'PUBG-PRIME-3M','prime_6m':'PUBG-PRIME-6M',
        'prime_12m':'PUBG-PRIME-12M','elite_pass':'PUBG-ELITE-PASS'
    }},
    'MOBILE LEGENDS': { tipo:'juego', input:['id_jugador','zona_id'], validar:/^\d{8,15}$/, paquetes:{
        '55':'ML-55','86':'ML-86','112':'ML-112','172':'ML-172',
        '257':'ML-257','429':'ML-429','706':'ML-706','1050':'ML-1050'
    }},
    'COD': { tipo:'juego', input:['id_jugador'], validar:/^\d{8,15}$/, paquetes:{
        '115':'COD-115','253':'COD-253','529':'COD-529','794':'COD-794','1053':'COD-1053',
        '1323':'COD-1323','2760':'COD-2760','6440':'COD-6440','9200':'COD-9200',
        '12880':'COD-12880','15640':'COD-15640','19320':'COD-19320'
    }},
    'ARENA BREAKOUT': { tipo:'juego', input:['id_jugador'], validar:/^\d{6,15}$/, paquetes:{
        '66':'AB-66','335':'AB-335','675':'AB-675','1690':'AB-1690','3400':'AB-3400','6820':'AB-6820',
        'bp_beginner':'AB-BP-BEGINNER','bp_adv':'AB-BP-ADV','bp_prem':'AB-BP-PREM','bp_prem3m':'AB-BP-PREM3M'
    }},
    'DELTA FORCE': { tipo:'juego', input:['id_jugador'], validar:/^\d{6,15}$/, paquetes:{
        '60':'DF-60','320':'DF-320','750':'DF-750','1480':'DF-1480','1980':'DF-1980',
        '3950':'DF-3950','8100':'DF-8100','sp_ops':'DF-SP-OPS','sp_war':'DF-SP-WAR','sp_dlx':'DF-SP-DLX'
    }},
    'BIGO LIVE': { tipo:'juego', input:['id_jugador'], validar:/^\d{6,15}$/, paquetes:{
        '100':'BIGO-100','500':'BIGO-500','1000':'BIGO-1000','10000':'BIGO-10000'
    }},
    'PLAYSTATION': { tipo:'giftcard', input:['id_jugador'], paquetes:{
        '1':'PSN-1','2':'PSN-2','3':'PSN-3','4':'PSN-4','5':'PSN-5','10':'PSN-10','15':'PSN-15',
        '20':'PSN-20','25':'PSN-25','30':'PSN-30','35':'PSN-35','40':'PSN-40','45':'PSN-45',
        '50':'PSN-50','75':'PSN-75','100':'PSN-100'
    }},
    'XBOX': { tipo:'giftcard', input:['id_jugador'], paquetes:{
        '1':'XBOX-1','5':'XBOX-5','10':'XBOX-10','15':'XBOX-15',
        '20':'XBOX-20','25':'XBOX-25','50':'XBOX-50','100':'XBOX-100'
    }},
    'NINTENDO': { tipo:'giftcard', input:['id_jugador'], paquetes:{
        '5':  'NINTENDO-5','10': 'NINTENDO-10','20': 'NINTENDO-20',
        '35': 'NINTENDO-35','50': 'NINTENDO-50','70': 'NINTENDO-70'
    }},
    'NETFLIX': { tipo:'giftcard', input:['email'], paquetes:{
        '15':'NETFLIX-15','20':'NETFLIX-20','25':'NETFLIX-25','30':'NETFLIX-30',
        '50':'NETFLIX-50','60':'NETFLIX-60','75':'NETFLIX-75','100':'NETFLIX-100'
    }},
    'GOOGLE PLAY': { tipo:'giftcard', input:['email'], paquetes:{
        '10-eur-de':'GPLAY-10-EUR-DE','15-eur-es':'GPLAY-15-EUR-ES',
        '10-gbp-uk':'GPLAY-10-GBP-UK','100-gbp-uk':'GPLAY-100-GBP-UK'
    }},
    'ROBLOX': { tipo:'giftcard', input:['id_jugador'], validar:/^\d{10,13}$/, paquetes:{
        '50':'RBX-50','100':'RBX-100','275':'RBX-275','360':'RBX-360',
        '555':'RBX-555','1000':'RBX-1000','2000':'RBX-2000','2400':'RBX-2400'
    }}
};

function getUUID(juego, paquete) {
    const j = String(juego).toUpperCase().trim();
    const p = String(paquete);
    const config = PRODUCTOS_CONFIG[j];
    if (!config) return null;
    const sku = config.paquetes[p];
    if (!sku) return null;
    return SKU_MAP[sku] || null;
}

function validarID(juego, id) {
    const j = String(juego).toUpperCase().trim();
    const config = PRODUCTOS_CONFIG[j];
    if (!config || !config.validar) return true;
    if (config.tipo === 'giftcard' && config.input.includes('email')) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(id).trim());
    }
    return config.validar.test(String(id).trim());
}

function calcularPrecio(costoUSD, tipo) {
    const margen = tipo === 'giftcard' ? MARGEN_GIFTCARDS : MARGEN_JUEGOS;
    return (costoUSD * margen).toFixed(4);
}

async function notificarTelegram(mensaje) {
    try {
        const TG_TOKEN = process.env.TELEGRAM_TOKEN;
        const TG_CHAT = process.env.TELEGRAM_CHAT_ID;
        if (!TG_TOKEN || !TG_CHAT) return;
        await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TG_CHAT, text: mensaje, parse_mode: 'HTML' })
        });
    } catch (e) { console.error('⚠️ Error Telegram:', e.message); }
}

function verificarFirmaWebhook(req, rawBody) {
    const secret = process.env.CENTRAL_ONE_WEBHOOK_SECRET;
    if (!secret) return true;

    const signature = req.headers['x-centralone-signature'];
    const timestamp = req.headers['x-centralone-timestamp'];

    if (!signature || !timestamp) return false;

    const esperada = "sha256=" + createHmac("sha256", secret)
        .update(`${timestamp}.${rawBody}`)
        .digest("hex");

    const a = Buffer.from(esperada);
    const b = Buffer.from(signature);

    return a.length === b.length && timingSafeEqual(a, b);
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CentralOne-Signature, X-CentralOne-Timestamp');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const API_KEY = process.env.CENTRAL_ONE_API_KEY;
    if (!API_KEY && req.method !== 'POST') {
        return res.status(500).json({ error: 'API Key no configurada' });
    }

    if (req.method === 'POST' && req.headers['x-centralone-signature']) {
        let rawBody = JSON.stringify(req.body);
        if (!verificarFirmaWebhook(req, rawBody)) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const event = req.body;
        try {
            if (dbAdmin && event.order_reference) {
                const orderId = event.order_reference;
                if (event.event === 'order.delivered') {
                    await notificarTelegram(`✅ <b>WEBHOOK: PEDIDO ENTREGADO</b>\nOrden: ${orderId}`);
                } 
                else if (event.event === 'order.failed') {
                    await notificarTelegram(`❌ <b>WEBHOOK: PEDIDO FALLIDO</b>\nOrden: ${orderId}\nMotivo: ${event.failure?.message || 'Desconocido'}`);
                }
                else if (event.event === 'order.refunded') {
                    await notificarTelegram(`💰 <b>WEBHOOK: PEDIDO REEMBOLSADO</b>\nOrden: ${orderId}`);
                }
            }
            return res.status(200).json({ received: true });
        } catch (error) {
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    if (req.method === 'GET') {
        const accion = req.query?.accion;

        if (accion === 'catalogo') {
            const r = await fetch(`${BASE_URL}/catalog`, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
            const data = await r.json();
            return res.status(r.status).json(data);
        }

        if (accion === 'juegos') {
            const juegos = Object.keys(PRODUCTOS_CONFIG).map(j => ({
                nombre: j, tipo: PRODUCTOS_CONFIG[j].tipo, paquetes: Object.keys(PRODUCTOS_CONFIG[j].paquetes)
            }));
            return res.status(200).json({ juegos, total: juegos.length });
        }

        if (accion === 'saldo') {
            const r = await fetch(`${BASE_URL}/balance`, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
            const data = await r.json();
            return res.status(r.status).json(data);
        }

        if (accion === 'verificar_jugador') {
            const { juego, id_jugador, zona_id } = req.query;
            if (!juego || !id_jugador) return res.status(400).json({ error: 'Faltan parámetros' });

            const juegoUpper = juego.toUpperCase();
            const config = PRODUCTOS_CONFIG[juegoUpper];
            if (!config) return res.status(400).json({ error: `Juego no soportado: ${juego}` });

            let productId = null;
            if (juegoUpper === 'FREE FIRE') productId = SKU_MAP['FF-110-DIAMONDS'];
            else if (juegoUpper === 'FREE FIRE BR') productId = SKU_MAP['FF-BR-110'];
            else {
                const primerPaquete = Object.keys(config.paquetes)[0];
                productId = SKU_MAP[config.paquetes[primerPaquete]];
            }

            if (!productId) return res.status(400).json({ error: 'No se encontró product_id válido.' });

            const targetPayload = {};
            const juegosConGameUserId = ['FREE FIRE BR', 'RACING MASTER', 'SUPER SUS', 'MARVEL RIVALS', 'HONOR OF KINGS'];
            
            if (juegosConGameUserId.includes(juegoUpper)) {
                targetPayload.game_user_id = String(id_jugador);
            } else if (juegoUpper === 'MOBILE LEGENDS') {
                targetPayload.player_id = String(id_jugador);
                targetPayload.server = zona_id || '1';
            } else {
                targetPayload.player_id = String(id_jugador);
            }

            try {
                const respuesta = await fetch(`${BASE_URL}/player/validate`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ product_id: productId, target_payload: targetPayload })
                });
                const data = await respuesta.json();
                return res.status(200).json({
                    ok: true, valido: data.status === 'valid', status: data.status,
                    nickname: data.player?.name || null, reason: data.reason || null,
                    mensaje: data.status === 'valid' ? 'ID verificado' : (data.status === 'invalid' ? 'El ID no existe' : 'No se pudo verificar')
                });
            } catch (error) {
                return res.status(200).json({ ok: false, valido: false, status: 'unverified', mensaje: 'Error de conexión' });
            }
        }

        if (accion === 'estado_pedido') {
            const { id } = req.query;
            if (!id) return res.status(400).json({ error: 'Falta el ID del pedido' });
            try {
                const r = await fetch(`${BASE_URL}/orders/${id}`, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
                const data = await r.json();
                return res.status(r.status).json(data);
            } catch (e) {
                return res.status(500).json({ error: 'Error consultando pedido' });
            }
        }

        return res.status(200).json({
            mensaje: '✅ API Central One v6.9 funcionando',
            version: '6.9',
            acciones: ['catalogo', 'juegos', 'saldo', 'verificar_jugador', 'estado_pedido']
        });
    }

    if (req.method === 'POST') {
        const { accion, datos } = req.body || {};

        if (accion === 'recarga') {
            const { juego, id_jugador, paquete, email, servidor, zona_id } = datos || {};
            if (!juego || !paquete) return res.status(400).json({ error: 'Faltan datos (juego, paquete)' });

            const config = PRODUCTOS_CONFIG[juego.toUpperCase()];
            if (!config) return res.status(400).json({ error: `Juego no soportado: ${juego}` });

            const inputRequerido = config.tipo === 'giftcard' && config.input.includes('email') ? email : id_jugador;
            if (!inputRequerido) return res.status(400).json({ error: 'Falta input requerido' });
            if (!validarID(juego, inputRequerido)) return res.status(400).json({ error: `Formato inválido para ${juego}` });

            const productId = getUUID(juego, paquete);
            if (!productId) return res.status(400).json({ error: `Paquete no encontrado` });

            const juegoUpper = juego.toUpperCase();
            const idempotencyKey = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

            const payload = {
                items: [{ catalog_item_id: productId, quantity: 1 }],
                note: `${juegoUpper} - ${inputRequerido} - Paquete: ${paquete}`
            };

            const juegosConGameUserId = ['FREE FIRE BR', 'RACING MASTER', 'SUPER SUS', 'MARVEL RIVALS', 'HONOR OF KINGS'];
            if (juegosConGameUserId.includes(juegoUpper)) {
                payload.items[0].target_payload = { game_user_id: String(id_jugador) };
            } else if (juegoUpper === 'MOBILE LEGENDS') {
                payload.items[0].target_payload = { player_id: id_jugador, server: zona_id || servidor || '1' };
            } else if (config.tipo === 'giftcard' && config.input.includes('email')) {
                payload.items[0].target_payload = { email: email };
            } else {
                payload.items[0].target_payload = { player_id: id_jugador };
            }

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
                        await notificarTelegram(`⚠️ <b>SALDO INSUFICIENTE</b>\n🎮 ${juegoUpper}\n📦 ${paquete}`);
                        return res.status(409).json({ error: 'Saldo insuficiente', sinSaldo: true });
                    }
                    if (data.error?.code === 'insufficient_stock') {
                        return res.status(409).json({ error: 'Producto agotado', sinStock: true });
                    }
                }
                return res.status(r.status).json({ error: data.error?.message || 'Error en la recarga', detalle: data });
            }

            const orderId = data.order?.id;
            const referenceCode = data.order?.reference_code;
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
                                if (it.codes?.length > 0) { codigos = it.codes; break; }
                            }
                        }
                    } catch (e) { /* continuar */ }
                }
            }

            const status = data.order?.status || 'confirmed';
            const esExitosa = ['confirmed', 'completed', 'processing'].includes(status);
            const costo = parseFloat(data.order?.total_sale_amount || 0);
            const precioVenta = calcularPrecio(costo, config.tipo);

            // ✅ FORMATO EXACTO COMO LA FOTO
            const emojiEstado = esExitosa ? '✅' : '⚠️';
            const tituloEstado = esExitosa ? 'COMPLETADA' : 'PENDIENTE';
            
            let mensajeTG = `${emojiEstado} <b>Pedido #${orderId ? orderId.slice(-4) : '----'} →</b>\n`;
            mensajeTG += `<b>${tituloEstado}</b>\n`;
            mensajeTG += `📦 ${juegoUpper} - ${paquete}\n`;
            mensajeTG += `💰 $${precioVenta} USD\n\n`;
            
            if (config.tipo !== 'giftcard') {
                mensajeTG += `<b>Datos del Jugador:</b>\n`;
                mensajeTG += `🆔 ID: <code>${inputRequerido}</code>\n`;
                mensajeTG += `👤 Nombre: Jugador Verificado\n`;
                mensajeTG += `🔢 Ref. Bancaria: <code>${referenceCode || 'N/A'}</code>\n`;
                mensajeTG += `🔗 ID Central One: <code>${referenceCode || 'N/A'}</code>\n`;
            } else {
                mensajeTG += `🆔 <code>${inputRequerido}</code>\n`;
                mensajeTG += `📋 Orden: ${referenceCode || 'N/A'}\n`;
                if (codigos.length > 0) mensajeTG += `🎟️ <b>PIN:</b> <code>${codigos[0]}</code>\n`;
            }

            await notificarTelegram(mensajeTG);

            return res.status(201).json({
                exito: esExitosa,
                mensaje: esExitosa ? (config.tipo === 'giftcard' ? 'Gift Card generada ✅' : 'Recarga exitosa ✅') : 'Procesando ⏳',
                id_solicitud: orderId,
                referencia: referenceCode,
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
}
