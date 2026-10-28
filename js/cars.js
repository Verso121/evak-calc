// База авто. Формат: "Модель:Категория", через запятую.
// Категории: L — легковой, K — кроссовер/внедорожник/минивэн/микроавтобус, M — мото,
// C — коммерческий до 5 т (Газели, фургоны, автобусы, грузовики), S — спецтехника до 5 т.
// Микроавтобусы — в K. Третье поле у C/S — примерная собственная масса, т.
(function (root) {
  const RAW = {
    "Lada (ВАЗ)": "Granta:L,Vesta:L,Vesta SW:L,Vesta SW Cross:L,Iskra:L,Aura:L,Largus:L,Largus фургон:C:1.3,XRAY:L,Niva Legend:K,Niva Travel:K,4x4 (Нива):K,Priora:L,Kalina:L,Samara:L,2101:L,2104:L,2105:L,2106:L,2107:L,2109:L,2110:L,2112:L,2114:L,2115:L,Ока:L",
    "УАЗ": "Patriot:K,Хантер:K,Пикап:K,Буханка 452 фургон:C:1.9,Буханка 2206 пассажирский:K,Профи:C:2,469:K",
    "ГАЗ": "Газель Next:C:2,Газель Next цельнометалл:C:2.2,Газель Next автобус:C:2.9,Газель Business:C:1.9,Газель 3302:C:1.85,Газель 2705 фургон:C:1.95,Газель City:C:3.4,Соболь:C:1.9,Соболь NN:C:2,Соболь Бизнес:C:1.9,Газон Next:C:3.6,Валдай:C:3.5,Садко Next:C:4.6,Волга 3110:L,Волга 31105:L,Волга 24:L,Volga Siber:L",
    "ЗИЛ": "Бычок 5301:C:3.6",
    "КамАЗ": "Компас 5:C:3.3",
    "Москвич": "3:K,3е:K,6:L,412:L,2140:L,2141:L",
    "ИЖ": "2126 Ода:L,2717 пирожок:C:1.1,2715:C:1",
    "ЗАЗ": "Chance:L,Sens:L,Таврия:L,Запорожец:L",
    "Toyota": "Camry:L,Corolla:L,Avensis:L,Auris:L,Prius:L,Yaris:L,Mark II:L,Mark X:L,Crown:L,Allion:L,Premio:L,Vitz:L,Aqua:L,Belta:L,RAV4:K,Land Cruiser Prado:K,Land Cruiser 100:K,Land Cruiser 200:K,Land Cruiser 300:K,Highlander:K,Fortuner:K,Hilux:K,C-HR:K,Venza:K,4Runner:K,Harrier:K,Rush:K,Tundra:K,Sequoia:K,Alphard:K,Noah:K,Voxy:K,Estima:K,Sienna:K,Wish:K,Hiace фургон:C:2,Hiace автобус:K,Dyna:C:2.5,Coaster:C:4",
    "Lexus": "ES:L,IS:L,GS:L,LS:L,RX:K,NX:K,UX:K,LX:K,GX:K,LM:K",
    "Nissan": "Almera:L,Sentra:L,Teana:L,Tiida:L,Note:L,Micra:L,Primera:L,Sunny:L,Bluebird:L,Leaf:L,Wingroad:L,AD:L,Qashqai:K,X-Trail:K,Juke:K,Murano:K,Pathfinder:K,Patrol:K,Terrano:K,Navara:K,Serena:K,Elgrand:K,NV200:C:1.4,NV350 Caravan:C:1.9,Cabstar:C:2.2,Atlas:C:2.3",
    "Honda": "Civic:L,Accord:L,Fit:L,Jazz:L,Insight:L,Shuttle:L,Grace:L,CR-V:K,HR-V:K,Pilot:K,Vezel:K,Stepwgn:K,Freed:K,Odyssey:K,Stream:K,Elysion:K",
    "Mazda": "3:L,6:L,2:L,Demio:L,Axela:L,Atenza:L,323:L,626:L,CX-3:K,CX-30:K,CX-5:K,CX-7:K,CX-9:K,CX-50:K,CX-60:K,CX-90:K,Tribute:K,MPV:K,Premacy:K,BT-50:K,Bongo:C:1.4,Titan:C:2.5",
    "Mitsubishi": "Lancer:L,Galant:L,Colt:L,Mirage:L,Outlander:K,ASX:K,Pajero:K,Pajero Sport:K,Pajero Mini:K,L200:K,Eclipse Cross:K,Delica:K,Grandis:K,Canter (Fuso):C:2.5",
    "Subaru": "Impreza:L,Legacy:L,Levorg:L,WRX:L,Forester:K,Outback:K,XV:K,Tribeca:K,Ascent:K",
    "Suzuki": "Swift:L,SX4:L,Liana:L,Baleno:L,Vitara:K,Grand Vitara:K,Jimny:K,Escudo:K,Every:C:0.9",
    "Hyundai": "Solaris:L,Elantra:L,Sonata:L,Accent:L,i20:L,i30:L,i40:L,Getz:L,Matrix:L,Avante:L,Creta:K,Tucson:K,Santa Fe:K,Grand Santa Fe:K,ix35:K,ix55:K,Palisade:K,Terracan:K,Galloper:K,H-1 (Starex):K,Staria:K,Porter:C:1.7,HD35:C:2.4,HD65:C:2.7,HD78:C:3.4,Mighty:C:3.1,County:C:4",
    "Kia": "Rio:L,Rio X:L,Cerato:L,Optima:L,K5:L,Ceed:L,Picanto:L,Stinger:L,Soul:L,Spectra:L,Magentis:L,Sportage:K,Sorento:K,Seltos:K,Mohave:K,Carnival:K,Carens:K,Sonet:K,Bongo:C:1.8",
    "Chevrolet": "Lacetti:L,Aveo:L,Cruze:L,Cobalt:L,Spark:L,Malibu:L,Lanos:L,Epica:L,Niva:K,Captiva:K,Tahoe:K,TrailBlazer:K,Orlando:K,Tracker:K,Equinox:K,Express:C:2.6",
    "Daewoo": "Nexia:L,Matiz:L,Gentra:L,Lanos:L,Espero:L,Damas:C:0.85,Labo:C:0.8",
    "Ravon": "R2:L,R4:L,Nexia R3:L,Gentra:L",
    "Ford": "Focus:L,Mondeo:L,Fiesta:L,Fusion:L,Mustang:L,Kuga:K,Explorer:K,EcoSport:K,Escape:K,Edge:K,Ranger:K,Maverick:K,F-150:K,Galaxy:K,S-Max:K,C-Max:K,Transit фургон:C:2.2,Transit Custom:C:2,Transit автобус:C:2.8,Tourneo:K",
    "Volkswagen": "Polo:L,Jetta:L,Passat:L,Passat CC:L,Golf:L,Arteon:L,Bora:L,Tiguan:K,Touareg:K,Teramont:K,Taos:K,Amarok:K,Touran:K,Sharan:K,Caddy:C:1.4,Transporter:C:1.9,Multivan:K,Caravelle:K,Crafter:C:2.3,Crafter автобус:C:2.9,LT:C:2.1",
    "Skoda": "Octavia:L,Rapid:L,Superb:L,Fabia:L,Kodiaq:K,Karoq:K,Yeti:K,Kamiq:K",
    "Audi": "A3:L,A4:L,A5:L,A6:L,A7:L,A8:L,80:L,100:L,Q3:K,Q5:K,Q7:K,Q8:K,e-tron:K,Allroad:K",
    "BMW": "1 серия:L,2 серия:L,3 серия:L,4 серия:L,5 серия:L,6 серия:L,7 серия:L,8 серия:L,i3:L,i4:L,X1:K,X2:K,X3:K,X4:K,X5:K,X6:K,X7:K,XM:K,iX:K",
    "Mercedes-Benz": "A-класс:L,B-класс:L,C-класс:L,E-класс:L,S-класс:L,CLA:L,CLS:L,GLA:K,GLB:K,GLC:K,GLE:K,GLS:K,G-класс:K,ML:K,GL:K,GLK:K,V-класс:K,Vito:C:1.9,Viano:K,Sprinter фургон:C:2.2,Sprinter автобус:C:3,Vario:C:4",
    "Opel": "Astra:L,Corsa:L,Insignia:L,Vectra:L,Omega:L,Zafira:K,Meriva:K,Mokka:K,Antara:K,Frontera:K,Vivaro:C:1.8,Movano:C:2.1,Combo:C:1.4",
    "Peugeot": "206:L,207:L,208:L,301:L,307:L,308:L,406:L,407:L,408:L,508:L,2008:K,3008:K,4007:K,5008:K,Partner:C:1.3,Expert:C:1.7,Traveller:K,Boxer:C:2",
    "Citroen": "C3:L,C4:L,C5:L,C-Elysee:L,C4 Picasso:K,C-Crosser:K,C5 Aircross:K,Berlingo:C:1.3,Jumpy:C:1.7,SpaceTourer:K,Jumper:C:2",
    "Renault": "Logan:L,Sandero:L,Sandero Stepway:L,Symbol:L,Megane:L,Fluence:L,Clio:L,Laguna:L,Duster:K,Arkana:K,Kaptur:K,Koleos:K,Scenic:K,Kangoo:C:1.3,Dokker:C:1.2,Trafic:C:1.8,Master:C:2.1",
    "Fiat": "Albea:L,Punto:L,Linea:L,500:L,Tipo:L,Doblo:C:1.3,Ducato:C:2,Scudo:C:1.7",
    "Volvo": "S40:L,S60:L,S80:L,S90:L,V40:L,V60:L,V90:L,XC40:K,XC60:K,XC70:K,XC90:K",
    "Land Rover": "Range Rover:K,Range Rover Sport:K,Range Rover Evoque:K,Range Rover Velar:K,Discovery:K,Discovery Sport:K,Defender:K,Freelander:K",
    "Jeep": "Grand Cherokee:K,Cherokee:K,Wrangler:K,Compass:K,Renegade:K,Liberty:K",
    "Porsche": "911:L,Panamera:L,Taycan:L,Cayenne:K,Macan:K",
    "Infiniti": "G:L,Q50:L,Q70:L,QX50:K,QX56:K,QX60:K,QX70:K,QX80:K,FX:K,EX:K",
    "Cadillac": "CTS:L,ATS:L,Escalade:K,SRX:K,XT5:K,XT6:K",
    "Dodge / RAM": "Caliber:L,Charger:L,Challenger:L,Journey:K,Durango:K,Caravan:K,RAM 1500:K",
    "Chrysler": "300C:L,Sebring:L,Pacifica:K,Voyager:K,Town & Country:K",
    "Mini": "Cooper:L,Clubman:L,Countryman:K",
    "Smart": "Fortwo:L,Forfour:L",
    "SsangYong": "Actyon:K,Kyron:K,Rexton:K,Korando:K,Musso:K,Tivoli:K,Stavic:K",
    "Haval": "Jolion:K,F7:K,F7x:K,H6:K,H9:K,H2:K,Dargo:K,M6:K",
    "Great Wall": "Hover:K,Wingle:K,Poer:K,Safe:K",
    "Chery": "Tiggo 2:K,Tiggo 3:K,Tiggo 4:K,Tiggo 4 Pro:K,Tiggo 7:K,Tiggo 7 Pro:K,Tiggo 7 Pro Max:K,Tiggo 8:K,Tiggo 8 Pro:K,Tiggo 8 Pro Max:K,Tiggo 9:K,Arrizo 5:L,Arrizo 8:L,Bonus:L,Very:L,Amulet:L,QQ:L,Fora:L",
    "Exeed": "LX:K,TXL:K,RX:K,VX:K,Yaoguang:K",
    "Omoda": "C5:K,S5:L,C7:K",
    "Jaecoo": "J7:K,J8:K",
    "Geely": "Coolray:K,Atlas:K,Atlas Pro:K,Monjaro:K,Tugella:K,Okavango:K,Cityray:K,Emgrand:L,Emgrand 7:L,Emgrand X7:K,Preface:L,MK:L",
    "Belgee": "X50:K,X70:K,S50:L",
    "Changan": "CS35 Plus:K,CS55 Plus:K,CS75 Plus:K,CS85:K,CS95:K,UNI-K:K,UNI-S:K,UNI-T:K,UNI-V:L,Alsvin:L,Eado:L,Lamore:L,Hunter:K",
    "Tank": "300:K,400:K,500:K,700:K",
    "Jetour": "Dashing:K,X50:K,X70:K,X90:K,T2:K",
    "Kaiyi": "E5:L,X3:K,X7:K",
    "Tenet": "T4:K,T7:K,T8:K",
    "Solaris (бренд)": "S:L,HS:K",
    "JAC": "J7:L,JS3:K,JS4:K,JS6:K,T6:K,T8:K,Sunray:C:2.3,N56:C:2.5,N75:C:3,N80:C:3.3",
    "Foton": "Tunland:K,Toano:C:2.2,View:C:2.1,Aumark:C:2.6,Ollin:C:2.3",
    "DongFeng": "Aeolus Shine:L,580:K,AX7:K,Captain:C:2.5",
    "FAW": "Bestune B70:L,Bestune T55:K,Bestune T77:K,Bestune T99:K,Besturn B50:L,Tiger V:C:2.5",
    "Hongqi": "H5:L,H9:L,HS3:K,HS5:K,HS7:K,E-HS9:K",
    "BYD": "Han:L,Seal:L,Qin:L,Song Plus:K,Song Pro:K,Tang:K,Atto 3:K,Yuan:K,Leopard:K",
    "Li Auto": "L6:K,L7:K,L8:K,L9:K",
    "Zeekr": "001:L,007:L,7X:K,X:K",
    "Voyah": "Free:K,Dream:K,Passion:L",
    "Lifan": "Solano:L,Smily:L,Breez:L,Cebrium:L,X50:K,X60:K,Myway:K",
    "Livan": "X3 Pro:K,S6 Pro:L,X6 Pro:K",
    "Brilliance": "V5:K,H230:L",
    "Datsun": "on-DO:L,mi-DO:L",
    "Iveco": "Daily фургон:C:2.3,Daily автобус:C:3.2,Daily шасси:C:2.4",
    "Isuzu": "D-Max:K,Elf:C:2.4,NMR:C:2.5,NPR:C:3",
    "Hino": "300 / Dutro:C:2.7",
    "Мото": "Мотоцикл:M,Мотоцикл тяжёлый (круизер):M,Скутер / мопед:M,Квадроцикл:M,Багги:M,Снегоход:M,Гидроцикл:M",
    "Спецтехника": "Мини-погрузчик (Bobcat и др.):S:2.8,Мини-экскаватор до 3 т:S:2,Мини-экскаватор 3–5 т:S:4,Вилочный погрузчик:S:3.5,Трактор МТЗ-82 / Беларус:S:3.8,Мини-трактор:S:1,Каток малый:S:1.5,Экскаватор-погрузчик (лёгкий):S:4.5,Телескопический погрузчик:S:4.5,Ножничный подъёмник:S:2.5,Генератор / компрессор на прицепе:S:1.5"
  };

  const BRAND_ALIASES = {
    "Lada (ВАЗ)": "лада ваз жигули", "Toyota": "тойота", "Lexus": "лексус", "Nissan": "ниссан нисан",
    "Honda": "хонда", "Mazda": "мазда", "Mitsubishi": "митсубиси мицубиси митсубиши", "Subaru": "субару",
    "Suzuki": "сузуки", "Hyundai": "хендай хундай хёндай хюндай", "Kia": "киа", "Chevrolet": "шевроле шевролет",
    "Daewoo": "дэу деу", "Ravon": "равон", "Ford": "форд", "Volkswagen": "фольксваген вольксваген фв vw",
    "Skoda": "шкода", "Audi": "ауди", "BMW": "бмв бэха", "Mercedes-Benz": "мерседес мерс бенц",
    "Opel": "опель", "Peugeot": "пежо", "Citroen": "ситроен", "Renault": "рено", "Fiat": "фиат",
    "Volvo": "вольво", "Land Rover": "ленд ровер рендж", "Jeep": "джип", "Porsche": "порше",
    "Infiniti": "инфинити", "Cadillac": "кадиллак", "Haval": "хавал хавейл", "Great Wall": "грейт волл",
    "Chery": "чери черри", "Exeed": "эксид", "Omoda": "омода", "Jaecoo": "джейку", "Geely": "джили",
    "Belgee": "белджи", "Changan": "чанган", "Tank": "танк", "Jetour": "джетур", "Kaiyi": "каи",
    "Tenet": "тенет", "JAC": "джак", "Foton": "фотон", "DongFeng": "донгфенг", "FAW": "фав",
    "Hongqi": "хончи хонгки", "BYD": "бид", "Li Auto": "ли лисян", "Zeekr": "зикр", "Voyah": "воя",
    "Lifan": "лифан", "Livan": "ливан", "Iveco": "ивеко", "Isuzu": "исузу", "Hino": "хино",
    "SsangYong": "санг йонг санйонг", "Mini": "мини", "Smart": "смарт", "Chrysler": "крайслер",
    "Dodge / RAM": "додж рам", "Brilliance": "бриллианс", "Datsun": "датсун"
  };

  const list = [];
  for (const brand of Object.keys(RAW)) {
    for (const item of RAW[brand].split(",")) {
      const parts = item.split(":");
      const mass = parts.length > 2 ? parseFloat(parts.pop()) : null;
      const cat = parts.pop().trim();
      list.push({ brand, model: parts.join(":").trim(), cat, mass });
    }
  }

  const TR = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"i",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sh",ъ:"",ы:"i",ь:"",э:"e",ю:"u",я:"a" };
  function lat(s) { return s.toLowerCase().replace(/[а-яё]/g, ch => TR[ch] ?? ch); }
  // Грубый «скелет» слова: без гласных и повторов — чтобы «камри» находило Camry
  function skel(s) {
    return lat(s).replace(/ph/g, "f").replace(/ck|c|q/g, "k").replace(/x/g, "ks").replace(/w/g, "v")
      .replace(/z/g, "s").replace(/[^a-z0-9]/g, "").replace(/(?!^)[aeiouy]/g, "").replace(/(.)\1+/g, "$1");
  }
  for (const c of list) {
    const text = (c.brand + " " + (BRAND_ALIASES[c.brand] || "") + " " + c.model).toLowerCase();
    c.hay = text;
    c.words = text.split(/[\s\/()\-]+/).filter(Boolean).map(w => ({ w, s: skel(w) }));
  }

  const HOMO = { "х":"x","с":"c","а":"a","е":"e","о":"o","р":"p","к":"k","т":"t","в":"b","м":"m","н":"h","у":"y","і":"i" };
  function homo(s) { return s.replace(/[хсаеоркт вмнуі]/g, ch => HOMO[ch] ?? ch); }
  function search(q, limit = 12) {
    q = q.trim().toLowerCase();
    if (!q) return [];
    const terms = q.split(/\s+/).filter(Boolean);
    const scored = [];
    for (const c of list) {
      let score = 0, ok = true;
      for (const t0 of terms) {
        let best = 0;
        for (const t of t0 === homo(t0) ? [t0] : [t0, homo(t0)]) {
        const ts = skel(t);
        for (const { w, s } of c.words) {
          if (w === t) best = Math.max(best, 4);
          else if (w.startsWith(t)) best = Math.max(best, 3);
          else if (w.includes(t)) best = Math.max(best, 2);
          else if (t === t0 && ts.length >= 2 && s.startsWith(ts)) best = Math.max(best, 1);
        }
        }
        if (!best) { ok = false; break; }
        score += best;
      }
      if (ok) scored.push({ c, score });
    }
    scored.sort((a, b) => b.score - a.score || a.c.brand.localeCompare(b.c.brand));
    return scored.slice(0, limit).map(x => x.c);
  }

  const api = { list, search, count: list.length };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CarDB = api;
})(typeof self !== "undefined" ? self : this);
