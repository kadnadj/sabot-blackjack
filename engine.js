/* ============================================================
 * Sabot — moteur de stratégie et de probabilités (fonctions pures)
 * Chargé par index.html en script classique (les déclarations
 * deviennent globales) et importable en Node pour les tests
 * (voir l'export en bas de fichier).
 *
 * Hypothèses de règles : multi-deck, S17 (croupier reste sur soft 17),
 * DAS (double après split autorisé), abandon tardif si disponible.
 * ============================================================ */

const RANKS = ['2','3','4','5','6','7','8','9','10','A'];
const RANK_LABEL = {'2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9','10':'10/J/Q/K','A':'A'};

function hiLoValue(rank){
  if(['2','3','4','5','6'].includes(rank)) return 1;
  if(['7','8','9'].includes(rank)) return 0;
  return -1; // 10, A
}

function initShoe(decks){
  const shoe = {};
  RANKS.forEach(r=>{
    shoe[r] = (r==='10') ? 16*decks : 4*decks; // 10/J/Q/K regroupés = 16 cartes/jeu
  });
  return shoe;
}

/* ====================== HAND VALUE ====================== */
function rankValue(r){
  if(r==='A') return 11;
  if(r==='10') return 10;
  return parseInt(r,10);
}

function computeHandValue(cards){
  let total = 0, aces = 0;
  cards.forEach(r=>{
    if(r==='A'){ aces++; total+=11; }
    else total += rankValue(r);
  });
  let softAces = aces;
  while(total>21 && softAces>0){ total -= 10; softAces--; }
  const soft = softAces>0; // un As encore compté 11
  return {total, soft, isPair: cards.length===2 && cards[0]===cards[1]};
}

/* ====================== DÉVIATIONS (Illustrious 18 simplifié) ====================== */
// Chaque entrée : main dure + carte croupier + seuil de true count.
// - minTC : appliquer l'action si TC >= minTC (déviation "positive")
// - maxTC : appliquer l'action si TC <  maxTC (déviation "négative",
//   ex. dur 13 vs 2 → tirer quand le sabot est pauvre en grosses cartes)
const DEVIATIONS = [
  {total:16, d:10, minTC:0,  action:'STAND',  why:'Déviation: Dur 16 vs 10, TC≥0 → rester (au lieu de tirer)'},
  {total:16, d:9,  minTC:5,  action:'STAND',  why:'Déviation: Dur 16 vs 9, TC≥5 → rester'},
  {total:15, d:10, minTC:4,  action:'STAND',  why:'Déviation: Dur 15 vs 10, TC≥4 → rester'},
  {total:13, d:2,  maxTC:-1, action:'HIT',    why:'Déviation: Dur 13 vs 2, TC<-1 → tirer (au lieu de rester)'},
  {total:12, d:2,  minTC:3,  action:'STAND',  why:'Déviation: Dur 12 vs 2, TC≥3 → rester'},
  {total:12, d:3,  minTC:2,  action:'STAND',  why:'Déviation: Dur 12 vs 3, TC≥2 → rester'},
  {total:12, d:4,  maxTC:0,  action:'HIT',    why:'Déviation: Dur 12 vs 4, TC<0 → tirer (au lieu de rester)'},
  {total:11, d:11, minTC:1,  action:'DOUBLE', why:'Déviation: Dur 11 vs As, TC≥1 → doubler'},
  {total:10, d:11, minTC:4,  action:'DOUBLE', why:'Déviation: Dur 10 vs As, TC≥4 → doubler'},
  {total:9,  d:2,  minTC:1,  action:'DOUBLE', why:'Déviation: Dur 9 vs 2, TC≥1 → doubler'},
  {total:9,  d:7,  minTC:3,  action:'DOUBLE', why:'Déviation: Dur 9 vs 7, TC≥3 → doubler'},
];

function applyDeviations(baseReco, playerCards, dealerRank, tc, useDeviations){
  if(!useDeviations || tc===null) return baseReco;
  const {total, soft, isPair} = computeHandValue(playerCards);
  if(soft || isPair) return baseReco; // ce sous-ensemble ne couvre que les mains dures
  const d = dealerRank==='A' ? 11 : rankValue(dealerRank);
  const hit = DEVIATIONS.find(dev =>
    dev.total===total && dev.d===d &&
    (dev.minTC!==undefined ? tc>=dev.minTC : tc<dev.maxTC)
  );
  if(hit) return {action:hit.action, why:hit.why, deviated:true};
  return baseReco;
}

function insuranceAdvice(dealerRank, tc){
  if(dealerRank!=='A' || tc===null) return null;
  return tc>=3
    ? {take:true, why:'Déviation: TC≥3 → prendre l\'assurance (rentable)'}
    : {take:false, why:'TC<3 → ne pas prendre l\'assurance (mise à espérance négative)'};
}

/* ====================== STRATÉGIE DE BASE (multi-deck, S17, DAS) ====================== */
function getBasicStrategy(playerCards, dealerRank){
  if(playerCards.length<1 || !dealerRank) return null;
  const {total, soft, isPair} = computeHandValue(playerCards);
  const d = dealerRank==='A' ? 11 : rankValue(dealerRank);

  // Paires
  if(isPair){
    const r = playerCards[0];
    if(r==='A') return {action:'SPLIT', why:'Toujours séparer les As'};
    if(r==='10') return {action:'STAND', why:'Ne jamais séparer les 10/figures'};
    if(r==='9'){
      if([2,3,4,5,6,8,9].includes(d)) return {action:'SPLIT', why:'Paire de 9 vs '+dealerRank};
      return {action:'STAND', why:'Paire de 9 vs 7/10/As → rester'};
    }
    if(r==='8') return {action:'SPLIT', why:'Toujours séparer les 8 (évite le 16)'};
    if(r==='7'){ if(d<=7) return {action:'SPLIT', why:'Paire de 7 vs 2-7'}; return {action:'HIT', why:'Paire de 7 vs 8+'}; }
    if(r==='6'){ if(d<=6) return {action:'SPLIT', why:'Paire de 6 vs 2-6 (DAS)'}; return {action:'HIT', why:'Paire de 6 vs 7+'}; }
    if(r==='5'){ if(d<=9) return {action:'DOUBLE', why:'5+5=10, doubler comme une main dure'}; return {action:'HIT', why:'10 vs 10/As → tirer'}; }
    if(r==='4'){ if(d===5||d===6) return {action:'SPLIT', why:'Paire de 4 vs 5-6 (DAS)'}; return {action:'HIT', why:'Paire de 4 ailleurs'}; }
    if(r==='3'||r==='2'){ if(d<=7) return {action:'SPLIT', why:'Petite paire vs 2-7 (DAS)'}; return {action:'HIT', why:'Petite paire vs 8+'}; }
  }

  // Totaux soft
  if(soft){
    if(total>=20) return {action:'STAND', why:'Soft 20+ → rester'};
    if(total===19) return {action:'STAND', why:'Soft 19 → rester (S17)'};
    if(total===18){
      if(d>=2 && d<=6) return {action:'DOUBLE', why:'Soft 18 vs 2-6 → doubler'};
      if(d===7||d===8) return {action:'STAND', why:'Soft 18 vs 7/8 → rester'};
      return {action:'HIT', why:'Soft 18 vs 9/10/As → tirer'};
    }
    if(total===17){ if(d>=3&&d<=6) return {action:'DOUBLE', why:'Soft 17 vs 3-6'}; return {action:'HIT', why:'Soft 17 ailleurs'}; }
    if(total===16||total===15){ if(d>=4&&d<=6) return {action:'DOUBLE', why:'Soft '+total+' vs 4-6'}; return {action:'HIT', why:'Soft '+total+' ailleurs'}; }
    if(total===14||total===13){ if(d===5||d===6) return {action:'DOUBLE', why:'Soft '+total+' vs 5-6'}; return {action:'HIT', why:'Soft '+total+' ailleurs'}; }
    return {action:'HIT', why:'Main soft basse'};
  }

  // Totaux durs
  if(total>=17) return {action:'STAND', why:'Total dur 17+ → rester'};
  if(total>=13 && total<=16){
    if(d<=6) return {action:'STAND', why:'Dur '+total+' vs carte faible (2-6) → rester'};
    if(total===16 && d>=9) return {action:'SURRENDER/HIT', why:'Dur 16 vs 9/10/As → abandonner si possible, sinon tirer'};
    if(total===15 && d===10) return {action:'SURRENDER/HIT', why:'Dur 15 vs 10 → abandonner si possible, sinon tirer'};
    return {action:'HIT', why:'Dur '+total+' vs carte forte (7+) → tirer'};
  }
  if(total===12){ if(d>=4&&d<=6) return {action:'STAND', why:'Dur 12 vs 4-6 → rester'}; return {action:'HIT', why:'Dur 12 ailleurs → tirer'}; }
  if(total===11){ if(d<=10) return {action:'DOUBLE', why:'Dur 11 vs 2-10 → doubler'}; return {action:'HIT', why:'Dur 11 vs As → tirer'}; }
  if(total===10){ if(d<=9) return {action:'DOUBLE', why:'Dur 10 vs 2-9 → doubler'}; return {action:'HIT', why:'Dur 10 vs 10/As → tirer'}; }
  if(total===9){ if(d>=3&&d<=6) return {action:'DOUBLE', why:'Dur 9 vs 3-6 → doubler'}; return {action:'HIT', why:'Dur 9 ailleurs → tirer'}; }
  return {action:'HIT', why:'Total bas → toujours tirer'};
}

/* ====================== PROBABILITÉS & COMPTAGE ====================== */
function totalRemaining(shoe){
  return RANKS.reduce((s,r)=>s+shoe[r],0);
}

function bustProbability(shoe, cards){
  if(cards.length===0) return null;
  const rem = totalRemaining(shoe);
  if(rem===0) return null;
  let bustWeight = 0;
  RANKS.forEach(r=>{
    const n = shoe[r];
    if(n<=0) return;
    const newVal = computeHandValue([...cards, r]);
    if(newVal.total>21) bustWeight += n;
  });
  return bustWeight/rem;
}

function highCardProbability(shoe){
  const rem = totalRemaining(shoe);
  if(rem===0) return null;
  const high = shoe['10'] + shoe['A'];
  return high/rem;
}

function trueCount(runningCount, shoe){
  const rem = totalRemaining(shoe);
  const decksRem = rem/52;
  if(decksRem < 0.25) return null;
  return runningCount/decksRem;
}

function estimatedEdge(tc){
  if(tc===null) return '≈ neutre';
  // règle du pouce : ~0,5 % d'avantage par point de TC, maison à ~-0,5 % de base
  const edge = (tc*0.5) - 0.5;
  const pct = edge.toFixed(1);
  if(edge>0.3) return '+'+pct+'% (favorable)';
  if(edge<-0.8) return pct+'% (défavorable)';
  return pct+'% (proche neutre)';
}

function betSuggestion(tc){
  if(tc===null || tc<1) return {label:'MISE MINIMALE', cls:'bet-min'};
  if(tc<2) return {label:'MISE NORMALE', cls:'bet-normal'};
  if(tc<4) return {label:'MISE ÉLEVÉE', cls:'bet-high'};
  return {label:'MISE MAXIMALE', cls:'bet-max'};
}

/* ====================== EXPORT NODE (tests) ====================== */
if(typeof module !== 'undefined' && module.exports){
  module.exports = {
    RANKS, RANK_LABEL, hiLoValue, initShoe, rankValue, computeHandValue,
    DEVIATIONS, applyDeviations, insuranceAdvice, getBasicStrategy,
    totalRemaining, bustProbability, highCardProbability,
    trueCount, estimatedEdge, betSuggestion
  };
}
