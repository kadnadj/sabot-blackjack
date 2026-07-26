'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  hiLoValue, initShoe, infiniteShoe, computeHandValue, applyDeviations, insuranceAdvice,
  getBasicStrategy, totalRemaining, bustProbability, highCardProbability,
  trueCount, betSuggestion
} = require('../engine.js');

/* ====================== computeHandValue ====================== */
describe('computeHandValue', () => {
  test('main dure simple', () => {
    assert.deepEqual(computeHandValue(['10', '6']), { total: 16, soft: false, isPair: false });
  });

  test('As compté 11 (soft)', () => {
    const v = computeHandValue(['A', '6']);
    assert.equal(v.total, 17);
    assert.equal(v.soft, true);
  });

  test('soft devient hard quand ça dépasse 21', () => {
    const v = computeHandValue(['A', '6', '9']); // 11+6+9=26 → 16 hard
    assert.equal(v.total, 16);
    assert.equal(v.soft, false);
  });

  test('As multiples : un seul reste à 11', () => {
    const v = computeHandValue(['A', 'A', '9']); // 11+1+9
    assert.equal(v.total, 21);
    assert.equal(v.soft, true);
  });

  test('As multiples tous réduits', () => {
    const v = computeHandValue(['A', 'A', '10', '9']); // 1+1+10+9
    assert.equal(v.total, 21);
    assert.equal(v.soft, false);
  });

  test('blackjack', () => {
    const v = computeHandValue(['A', '10']);
    assert.equal(v.total, 21);
    assert.equal(v.soft, true);
  });

  test('détection de paire uniquement à 2 cartes identiques', () => {
    assert.equal(computeHandValue(['8', '8']).isPair, true);
    assert.equal(computeHandValue(['8', '8', '8']).isPair, false);
    assert.equal(computeHandValue(['8', '9']).isPair, false);
    assert.equal(computeHandValue(['A', 'A']).isPair, true);
  });

  test('bust', () => {
    assert.equal(computeHandValue(['10', '10', '5']).total, 25);
  });
});

/* ====================== getBasicStrategy ====================== */
describe('getBasicStrategy — mains dures', () => {
  test('rien sans main ou sans carte croupier', () => {
    assert.equal(getBasicStrategy([], '10'), null);
    assert.equal(getBasicStrategy(['10', '6'], undefined), null);
  });

  test('17+ dur → STAND', () => {
    assert.equal(getBasicStrategy(['10', '7'], 'A').action, 'STAND');
  });

  test('16 vs 10 → abandon/tirer ; 16 vs 6 → STAND', () => {
    assert.equal(getBasicStrategy(['10', '6'], '10').action, 'SURRENDER/HIT');
    assert.equal(getBasicStrategy(['10', '6'], '9').action, 'SURRENDER/HIT');
    assert.equal(getBasicStrategy(['10', '6'], '8').action, 'HIT');
    assert.equal(getBasicStrategy(['10', '6'], '6').action, 'STAND');
  });

  test('15 vs 10 → abandon/tirer ; 15 vs 9 → HIT', () => {
    assert.equal(getBasicStrategy(['10', '5'], '10').action, 'SURRENDER/HIT');
    assert.equal(getBasicStrategy(['10', '5'], '9').action, 'HIT');
  });

  test('12 : STAND seulement vs 4-6', () => {
    assert.equal(getBasicStrategy(['10', '2'], '3').action, 'HIT');
    assert.equal(getBasicStrategy(['10', '2'], '4').action, 'STAND');
    assert.equal(getBasicStrategy(['10', '2'], '6').action, 'STAND');
    assert.equal(getBasicStrategy(['10', '2'], '7').action, 'HIT');
  });

  test('11 → DOUBLE sauf vs As ; 10 → DOUBLE sauf vs 10/As', () => {
    assert.equal(getBasicStrategy(['6', '5'], '10').action, 'DOUBLE');
    assert.equal(getBasicStrategy(['6', '5'], 'A').action, 'HIT');
    assert.equal(getBasicStrategy(['6', '4'], '9').action, 'DOUBLE');
    assert.equal(getBasicStrategy(['6', '4'], '10').action, 'HIT');
  });

  test('9 → DOUBLE vs 3-6 seulement', () => {
    assert.equal(getBasicStrategy(['4', '5'], '2').action, 'HIT');
    assert.equal(getBasicStrategy(['4', '5'], '3').action, 'DOUBLE');
    assert.equal(getBasicStrategy(['4', '5'], '6').action, 'DOUBLE');
    assert.equal(getBasicStrategy(['4', '5'], '7').action, 'HIT');
  });

  test('8 ou moins → HIT', () => {
    assert.equal(getBasicStrategy(['3', '5'], '6').action, 'HIT');
  });
});

describe('getBasicStrategy — mains soft', () => {
  test('soft 19 vs 6 → STAND (S17, pas de double H17)', () => {
    assert.equal(getBasicStrategy(['A', '8'], '6').action, 'STAND');
  });

  test('soft 18 : DOUBLE vs 2-6, STAND vs 7-8, HIT vs 9+', () => {
    assert.equal(getBasicStrategy(['A', '7'], '2').action, 'DOUBLE');
    assert.equal(getBasicStrategy(['A', '7'], '6').action, 'DOUBLE');
    assert.equal(getBasicStrategy(['A', '7'], '7').action, 'STAND');
    assert.equal(getBasicStrategy(['A', '7'], '8').action, 'STAND');
    assert.equal(getBasicStrategy(['A', '7'], '9').action, 'HIT');
    assert.equal(getBasicStrategy(['A', '7'], 'A').action, 'HIT');
  });

  test('soft 17 : DOUBLE vs 3-6, sinon HIT', () => {
    assert.equal(getBasicStrategy(['A', '6'], '2').action, 'HIT');
    assert.equal(getBasicStrategy(['A', '6'], '3').action, 'DOUBLE');
    assert.equal(getBasicStrategy(['A', '6'], '6').action, 'DOUBLE');
    assert.equal(getBasicStrategy(['A', '6'], '7').action, 'HIT');
  });

  test('soft 13-14 : DOUBLE vs 5-6 seulement', () => {
    assert.equal(getBasicStrategy(['A', '2'], '4').action, 'HIT');
    assert.equal(getBasicStrategy(['A', '2'], '5').action, 'DOUBLE');
    assert.equal(getBasicStrategy(['A', '3'], '6').action, 'DOUBLE');
  });

  test('soft 20 → STAND', () => {
    assert.equal(getBasicStrategy(['A', '9'], '6').action, 'STAND');
  });
});

describe('getBasicStrategy — paires', () => {
  test('A,A et 8,8 → toujours SPLIT', () => {
    assert.equal(getBasicStrategy(['A', 'A'], '10').action, 'SPLIT');
    assert.equal(getBasicStrategy(['8', '8'], 'A').action, 'SPLIT');
  });

  test('10,10 → jamais SPLIT', () => {
    assert.equal(getBasicStrategy(['10', '10'], '6').action, 'STAND');
  });

  test('9,9 : SPLIT sauf vs 7/10/As', () => {
    assert.equal(getBasicStrategy(['9', '9'], '6').action, 'SPLIT');
    assert.equal(getBasicStrategy(['9', '9'], '7').action, 'STAND');
    assert.equal(getBasicStrategy(['9', '9'], '9').action, 'SPLIT');
    assert.equal(getBasicStrategy(['9', '9'], '10').action, 'STAND');
  });

  test('5,5 : traité comme dur 10 → DOUBLE vs 2-9', () => {
    assert.equal(getBasicStrategy(['5', '5'], '9').action, 'DOUBLE');
    assert.equal(getBasicStrategy(['5', '5'], '10').action, 'HIT');
  });

  test('4,4 : SPLIT vs 5-6 (DAS), sinon HIT', () => {
    assert.equal(getBasicStrategy(['4', '4'], '4').action, 'HIT');
    assert.equal(getBasicStrategy(['4', '4'], '5').action, 'SPLIT');
    assert.equal(getBasicStrategy(['4', '4'], '6').action, 'SPLIT');
  });

  test('2,2 / 3,3 : SPLIT vs 2-7 (DAS)', () => {
    assert.equal(getBasicStrategy(['2', '2'], '7').action, 'SPLIT');
    assert.equal(getBasicStrategy(['3', '3'], '8').action, 'HIT');
  });
});

/* ====================== applyDeviations ====================== */
describe('applyDeviations', () => {
  const base = { action: 'BASE', why: 'base' };

  test('inactif si OFF ou TC null', () => {
    assert.equal(applyDeviations(base, ['10', '6'], '10', 5, false), base);
    assert.equal(applyDeviations(base, ['10', '6'], '10', null, true), base);
  });

  test('16 vs 10 : STAND dès TC≥0, pas en dessous', () => {
    assert.equal(applyDeviations(base, ['10', '6'], '10', 0, true).action, 'STAND');
    assert.equal(applyDeviations(base, ['10', '6'], '10', -0.1, true), base);
  });

  test('16 vs 9 : STAND à TC≥5 seulement', () => {
    assert.equal(applyDeviations(base, ['10', '6'], '9', 5, true).action, 'STAND');
    assert.equal(applyDeviations(base, ['10', '6'], '9', 4.9, true), base);
  });

  test('13 vs 2 (négative) : HIT si TC<-1, rien sinon', () => {
    assert.equal(applyDeviations(base, ['10', '3'], '2', -1.5, true).action, 'HIT');
    assert.equal(applyDeviations(base, ['10', '3'], '2', -1, true), base);
    assert.equal(applyDeviations(base, ['10', '3'], '2', 2, true), base);
  });

  test('12 vs 4 (négative) : HIT si TC<0', () => {
    assert.equal(applyDeviations(base, ['10', '2'], '4', -0.5, true).action, 'HIT');
    assert.equal(applyDeviations(base, ['10', '2'], '4', 0, true), base);
  });

  test('11 vs As : DOUBLE dès TC≥1', () => {
    assert.equal(applyDeviations(base, ['6', '5'], 'A', 1, true).action, 'DOUBLE');
    assert.equal(applyDeviations(base, ['6', '5'], 'A', 0.9, true), base);
  });

  test('ignore les mains soft et les paires', () => {
    // A,5 = soft 16 — la déviation 16 vs 10 ne doit PAS s'appliquer
    assert.equal(applyDeviations(base, ['A', '5'], '10', 3, true), base);
    // 8,8 = paire (dur 16) — idem
    assert.equal(applyDeviations(base, ['8', '8'], '10', 3, true), base);
  });

  test('marque deviated:true', () => {
    assert.equal(applyDeviations(base, ['10', '6'], '10', 2, true).deviated, true);
  });
});

/* ====================== insuranceAdvice ====================== */
describe('insuranceAdvice', () => {
  test('null si croupier sans As ou TC null', () => {
    assert.equal(insuranceAdvice('10', 5), null);
    assert.equal(insuranceAdvice('A', null), null);
  });

  test('prendre à TC≥3, refuser en dessous', () => {
    assert.equal(insuranceAdvice('A', 3).take, true);
    assert.equal(insuranceAdvice('A', 2.9).take, false);
  });
});

/* ====================== comptage & probabilités ====================== */
describe('comptage & probabilités', () => {
  test('hiLoValue : +1 (2-6), 0 (7-9), -1 (10/A)', () => {
    assert.equal(hiLoValue('2'), 1);
    assert.equal(hiLoValue('6'), 1);
    assert.equal(hiLoValue('7'), 0);
    assert.equal(hiLoValue('9'), 0);
    assert.equal(hiLoValue('10'), -1);
    assert.equal(hiLoValue('A'), -1);
  });

  test('initShoe : 52 cartes/jeu, 16 dix/jeu', () => {
    const shoe = initShoe(6);
    assert.equal(totalRemaining(shoe), 312);
    assert.equal(shoe['10'], 96);
    assert.equal(shoe['A'], 24);
  });

  test('trueCount = RC / jeux restants ; null sous 0,25 jeu', () => {
    const shoe = initShoe(1);
    assert.equal(trueCount(2, shoe), 2); // 1 jeu restant
    const emptyish = initShoe(1);
    Object.keys(emptyish).forEach(r => { emptyish[r] = 0; });
    emptyish['10'] = 12; // 12 cartes < 13 (0,25 jeu)
    assert.equal(trueCount(2, emptyish), null);
  });

  test('bustProbability : exacte sur un sabot contrôlé', () => {
    // Main 16 ; sabot : 5 cartes de 10 et 5 as → seuls les 10 font sauter
    const shoe = initShoe(1);
    Object.keys(shoe).forEach(r => { shoe[r] = 0; });
    shoe['10'] = 5; shoe['A'] = 5;
    assert.equal(bustProbability(shoe, ['10', '6']), 0.5);
    // Main vide → null
    assert.equal(bustProbability(shoe, []), null);
  });

  test('highCardProbability = (10 + As) / restantes', () => {
    const shoe = initShoe(1); // 16+4 = 20 sur 52
    assert.equal(highCardProbability(shoe), 20 / 52);
  });

  test('infiniteShoe : distribution 1/13, dix 4/13', () => {
    const shoe = infiniteShoe();
    assert.equal(totalRemaining(shoe), 13);
    assert.equal(shoe['10'], 4);
    assert.equal(shoe['A'], 1);
    // carte forte (10 ou As) = 5/13 quelle que soit l'historique
    assert.equal(highCardProbability(shoe), 5 / 13);
  });

  test('bustProbability en sabot infini : dur 16 → 8/13', () => {
    // Tout ce qui vaut ≥6 fait sauter un 16 : 6,7,8,9,10 → 1+1+1+1+4 = 8 sur 13
    assert.equal(bustProbability(infiniteShoe(), ['10', '6']), 8 / 13);
  });

  test('betSuggestion : paliers à TC 1 / 2 / 4', () => {
    assert.equal(betSuggestion(null).label, 'MISE MINIMALE');
    assert.equal(betSuggestion(0.9).label, 'MISE MINIMALE');
    assert.equal(betSuggestion(1).label, 'MISE NORMALE');
    assert.equal(betSuggestion(2).label, 'MISE ÉLEVÉE');
    assert.equal(betSuggestion(4).label, 'MISE MAXIMALE');
  });
});
