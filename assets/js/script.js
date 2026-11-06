/* ============================================================
   Bloom — script.js
   ------------------------------------------------------------
   Cosa contiene, nell'ordine in cui viene eseguito:

   1. Ripristino dello scroll   -> dopo un refresh si riparte dall'inizio
   2. Tema chiaro / scuro       -> applicato subito, prima del resto
   3. Tutto il resto            -> parte quando l'HTML è pronto
        - cambio tema (pulsante)
        - ombra e colore dell'header allo scroll
        - comparsa delle card scorrendo
        - carosello delle recensioni
        - modale "Richiedi preventivo"

   La spiegazione di ogni funzione è nel file README.md.
   ============================================================ */


/* ------------------------------------------------------------
   1. RIPRISTINO DELLO SCROLL
   Di base, quando ricarichi la pagina, il browser ti rimette
   dov'eri (oppure sulla sezione indicata da #lavori, #team...).
   Qui invece, al ricaricamento, si riparte sempre dall'inizio.
   ------------------------------------------------------------ */

// Dice al browser di non rimettere la pagina dov'era (vale dal refresh successivo)
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// Il tipo di apertura può essere 'navigate', 'reload', 'back_forward'...
const navigation = performance.getEntriesByType('navigation')[0];

// Solo se la pagina è stata ricaricata:
if (navigation && navigation.type === 'reload') {
  // toglie dall'indirizzo l'eventuale #sezione, altrimenti il browser tornerebbe lì
  if (location.hash) {
    history.replaceState(null, '', location.pathname + location.search);
  }

  // porta la pagina in cima, senza animazione ('instant' ignora lo scroll morbido del CSS)
  const goTop = () => scrollTo({ top: 0, left: 0, behavior: 'instant' });

  goTop();                            // subito...
  addEventListener('load', goTop);    // ...e di nuovo a caricamento finito, perché il browser
                                      // potrebbe riposizionare la pagina in quel momento
}


/* ------------------------------------------------------------
   2. TEMA CHIARO / SCURO (applicazione iniziale)
   Si decide il tema prima che la pagina sia disegnata, così non
   si vede il lampo di colore sbagliato.
   Ordine di priorità: scelta salvata -> tema del sistema.
   ------------------------------------------------------------ */

const root = document.documentElement;   // l'elemento <html>, dove si scrive data-theme

// Scelta salvata dall'utente la volta precedente (se c'è)
let saved = null;
try {
  saved = localStorage.getItem('bloom-theme');
} catch (e) {
  // localStorage non disponibile (es. navigazione privata): si usa il tema del sistema
}

// true se il sistema operativo / il browser è in modalità scura
const systemDark = matchMedia('(prefers-color-scheme: dark)').matches;

// Scrive data-theme="dark" oppure data-theme="light": il CSS reagisce a questo attributo
root.dataset.theme = saved || (systemDark ? 'dark' : 'light');


/* ------------------------------------------------------------
   3. IL RESTO: parte quando l'HTML è stato letto tutto
   ------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', () => {

  // ---------- Elementi della pagina (cercati per id) ----------
  const header = document.getElementById('mainHeader');
  const themeButton = document.getElementById('themeButton');
  const carousel = document.getElementById('reviewsCarousel');
  const modal = document.getElementById('quoteModal');
  const form = document.getElementById('quoteForm');
  const nameInput = document.getElementById('nameInput');
  const emailInput = document.getElementById('emailInput');
  const nameError = document.getElementById('nameError');
  const emailError = document.getElementById('emailError');

  // true se l'utente ha attivato "riduci animazioni" nel sistema
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');


  // ---------- Cambio tema ----------
  // Al clic sul pulsante luna/sole si passa da chiaro a scuro e viceversa
  themeButton.addEventListener('click', () => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;

    // ricorda la scelta per le prossime visite
    try {
      localStorage.setItem('bloom-theme', next);
    } catch (e) {
      // se non si può salvare, il tema cambia comunque
    }
  });


  // ---------- Header allo scroll ----------
  // Appena si scende di un pixel l'header riceve la classe "header-scrolled"
  // (sfondo verde, testo bianco, ombra: vedi style.css).
  function updateHeader() {
    header.classList.toggle('header-scrolled', window.scrollY > 0);
  }

  addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();   // controllo subito, nel caso la pagina si apra già scrollata


  // ---------- Animazione: le card compaiono quando entrano nello schermo ----------

  // 1) Ogni card dentro una .grid riceve la classe "reveal" (nascosta)
  //    e un numero --i (0, 1, 2) che serve per il ritardo a scalare.
  document.querySelectorAll('.grid').forEach((grid) => {
    [...grid.children].forEach((card, i) => {
      card.classList.add('reveal');
      card.style.setProperty('--i', i % 3);
    });
  });

  // 2) L'osservatore avvisa quando una card entra nello schermo
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;            // non ancora visibile: aspetta

      entry.target.classList.add('is-visible');     // fa partire l'animazione del CSS
      revealObserver.unobserve(entry.target);       // una volta sola: poi non serve più guardarla
    });
  }, { threshold: 0.15 });                          // basta che se ne veda il 15%

  // 3) Si mettono sotto osservazione tutte le card
  document.querySelectorAll('.reveal').forEach((card) => {
    revealObserver.observe(card);
  });


  // ---------- Carosello: scorre in continuo, all'infinito ----------
  const SPEED = 40;   // velocità in pixel al secondo: più alto = più veloce

  // Le recensioni vengono duplicate: arrivati alla copia si torna
  // all'inizio senza che si veda, e il giro non finisce mai.
  const originals = [...carousel.children];   // le recensioni scritte nell'HTML

  // Aggiunge in fondo una copia di tutte le recensioni
  function addCopy() {
    originals.forEach((card) => {
      const clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');   // gli screen reader non leggono i doppioni
      carousel.appendChild(clone);
    });
  }

  // Larghezza di un "giro": distanza tra la prima recensione e la sua copia
  const loopWidth = () => {
    return carousel.children[originals.length].offsetLeft - carousel.children[0].offsetLeft;
  };

  // Quanto si può scorrere al massimo
  const maxScroll = () => carousel.scrollWidth - carousel.clientWidth;

  // Assicura che ci siano abbastanza copie da riempire anche gli schermi molto larghi
  function fillCopies() {
    if (carousel.children.length === originals.length) {
      addCopy();                                    // la prima copia c'è sempre
    }

    let guard = 0;                                  // freno di sicurezza: massimo 6 copie in più
    while (maxScroll() < loopWidth() + 2 && guard++ < 6) {
      addCopy();
    }
  }

  fillCopies();
  addEventListener('resize', fillCopies);           // se la finestra si allarga servono più copie

  // Posizione "vera" con i decimali: scrollLeft arrotonda ai pixel interi,
  // e senza i decimali a velocità bassa il movimento andrebbe a scatti.
  let position = carousel.scrollLeft;

  let paused = false;
  let resumeTimer;

  // Ferma lo scorrimento automatico
  function pause() {
    clearTimeout(resumeTimer);
    paused = true;
  }

  // Lo fa ripartire dopo "delay" millisecondi
  function resume(delay = 0) {
    clearTimeout(resumeTimer);

    resumeTimer = setTimeout(() => {
      position = carousel.scrollLeft;   // riparte da dove l'utente ha lasciato il carosello
      paused = false;
    }, delay);
  }

  // Si ferma con mouse, tastiera (focus) o tocco
  carousel.addEventListener('mouseenter', pause);
  carousel.addEventListener('mouseleave', () => resume());
  carousel.addEventListener('focusin', pause);
  carousel.addEventListener('focusout', () => resume());
  carousel.addEventListener('touchstart', pause, { passive: true });
  carousel.addEventListener('touchend', () => resume(2000));   // sul telefono riparte dopo 2 secondi

  // Se l'utente scorre a mano oltre la copia, si torna indietro senza salti visibili
  let scrollTimer;

  carousel.addEventListener('scroll', () => {
    if (!paused) return;                // lo scorrimento automatico si corregge da solo in tick()

    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {    // aspetta che l'utente abbia smesso di scorrere
      const w = loopWidth();

      if (carousel.scrollLeft >= w - 2) {
        carousel.scrollLeft -= w;       // stesso contenuto, un giro indietro
      }
    }, 150);
  }, { passive: true });

  // Un piccolo passo a ogni fotogramma dello schermo (circa 60 volte al secondo)
  let lastTime = null;

  function tick(time) {
    const canMove = lastTime !== null && !paused && !reduceMotion.matches && !document.hidden;

    if (canMove) {
      // tempo passato dall'ultimo fotogramma (max 50ms: evita salti se il browser si è fermato)
      const elapsed = Math.min(time - lastTime, 50);

      position += SPEED * elapsed / 1000;     // pixel da percorrere in quel tempo

      const w = loopWidth();
      if (position >= w) {
        position -= w;                        // fine del giro: si ricomincia senza che si veda
      }

      carousel.scrollLeft = position;
    }

    lastTime = time;
    requestAnimationFrame(tick);              // prenota il fotogramma successivo
  }

  requestAnimationFrame(tick);


  // ---------- Modale "Richiedi preventivo" ----------
  let closeTimer;   // timer della chiusura automatica dopo l'invio

  // Toglie i messaggi di errore e i bordi rossi dal form
  function clearErrors() {
    nameInput.classList.remove('is-invalid');
    emailInput.classList.remove('is-invalid');
    nameError.textContent = '';
    emailError.textContent = '';
  }

  // Chiude la modale con dissolvenza:
  // la classe "is-closing" fa partire l'animazione del CSS, poi si chiude davvero.
  function closeModal() {
    clearTimeout(closeTimer);

    // già chiusa o già in chiusura: non fare niente
    if (!modal.open || modal.classList.contains('is-closing')) return;

    modal.classList.add('is-closing');

    setTimeout(() => {
      modal.classList.remove('is-closing');
      modal.close();
    }, reduceMotion.matches ? 0 : 250);   // 250ms = durata di modal-out nel CSS
  }

  // Pulsanti che aprono la modale (.open-modal)
  document.querySelectorAll('.open-modal').forEach((button) => {
    button.addEventListener('click', () => {
      clearTimeout(closeTimer);
      modal.classList.remove('is-closing', 'is-done');   // riparte dal form pulito
      form.reset();
      clearErrors();
      modal.showModal();
      nameInput.focus();                                 // il cursore va subito sul nome
    });
  });

  // Pulsanti che chiudono la modale (.close-modal: la × e "Chiudi")
  document.querySelectorAll('.close-modal').forEach((button) => {
    button.addEventListener('click', closeModal);
  });

  // Clic sullo sfondo scuro fuori dalla modale = chiude
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal();
    }
  });

  // Tasto Esc = chiude con la stessa dissolvenza
  modal.addEventListener('cancel', (event) => {
    event.preventDefault();   // blocca la chiusura immediata del browser
    closeModal();
  });

  // Appena si riprende a scrivere, gli errori spariscono
  nameInput.addEventListener('input', clearErrors);
  emailInput.addEventListener('input', clearErrors);

  // Invio del form
  form.addEventListener('submit', (event) => {
    event.preventDefault();   // niente ricaricamento della pagina
    clearErrors();

    // Controlli: nome non vuoto, email nel formato nome@dominio.estensione
    const nameOk = nameInput.value.trim() !== '';
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());

    if (!nameOk) {
      nameInput.classList.add('is-invalid');
      nameError.textContent = 'Inserisci il tuo nome.';
    }

    if (!emailOk) {
      emailInput.classList.add('is-invalid');
      emailError.textContent = 'Inserisci un’email valida.';
    }

    // Se c'è un errore, il cursore va sul primo campo sbagliato e ci si ferma qui
    if (!nameOk) {
      nameInput.focus();
      return;
    }

    if (!emailOk) {
      emailInput.focus();
      return;
    }

    // Tutto corretto: compare "Richiesta inviata" e dopo 2,5 secondi la modale si chiude da sola
    modal.classList.add('is-done');
    closeTimer = setTimeout(closeModal, 2500);
  });

});