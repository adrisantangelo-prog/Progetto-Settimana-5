                                                        AVVERTENZA
Ho provato ad utilizzare diverse tecniche, anche se non sono state studiate durante le ore di lezione, per poter portare un buon risultato.  
Ho utilizzato diversi siti (w3school,developer.mozilla,stock Overflow,) 
(Claude per spiegazioni più precise o pulizia di codice) per spiegazione più attendebili delle varie funzioni con i quali poi ho abbozzato un readme su JS.


# Progetto-Settimana-5 spiegazione di `script.js`

## Come è organizzato il file

Il codice viene eseguito dall'alto in basso in tre parti:

| # | Parte | Quando parte | A cosa serve |
|---|-------|--------------|--------------|
| 1 | Ripristino dello scroll | subito | dopo un refresh si riparte dall'inizio |
| 2 | Tema chiaro/scuro | subito | evita il lampo di colore sbagliato |
| 3 | Tutto il resto | a pagina pronta (`DOMContentLoaded`) | pulsante tema, header, animazioni, carosello, modale |

Le parti 1 e 2 girano **subito** (prima che la pagina sia disegnata) perché devono agire prima che l'utente veda qualcosa. La parte 3 aspetta che tutto l'HTML sia stato letto, altrimenti `getElementById` non troverebbe gli elementi.

---

## 1. Ripristino dello scroll

**Problema:** al refresh il browser rimette la pagina dov'eri, quindi la pagina "scende un po'".
**Soluzione:** si dice al browser di non farlo e, se la pagina è stata ricaricata, si torna in cima.

| Elemento | Cosa fa |
|----------|---------|
| `history.scrollRestoration = 'manual'` | Spegne il ripristino automatico dello scroll. Deve essere impostato sempre, non solo nel ramo `reload`. |
| `navigation` | Informazioni su come è stata aperta la pagina (`navigate`, `reload`, `back_forward`…). |
| `history.replaceState(...)` | Toglie dall'indirizzo l'eventuale `#sezione`, altrimenti il browser tornerebbe lì. |
| `goTop()` | Porta la pagina a `0,0` con `behavior: 'instant'` (senza lo scroll morbido del CSS). |
| `addEventListener('load', goTop)` | Lo richiama a caricamento finito, perché il browser può riposizionare la pagina in quel momento. |

Se si apre il sito direttamente con `#team`, la pagina va alla sezione normalmente: il codice agisce solo sul **ricaricamento**.

---

## 2. Tema chiaro/scuro (applicazione iniziale)

| Variabile | Cosa contiene |
|-----------|---------------|
| `root` | L'elemento `<html>`: è lì che si scrive `data-theme`. |
| `saved` | La scelta fatta dall'utente la volta scorsa (`localStorage`, chiave `bloom-theme`). È dentro `try/catch` perché in alcune modalità (es. navigazione privata) `localStorage` può dare errore. |
| `systemDark` | `true` se il sistema è in modalità scura. |

Ultima riga: `root.dataset.theme = saved || (systemDark ? 'dark' : 'light')`
Ordine di priorità: **scelta salvata → tema del sistema**. Il CSS reagisce a `:root[data-theme="dark"]`.

---

## 3. Dentro `DOMContentLoaded`

### 3.1 Riferimenti agli elementi

Il codice cerca gli elementi per `id` e li mette in costanti: `header`, `themeButton`, `carousel`, `modal`, `form`, `nameInput`, `emailInput`, `nameError`, `emailError`.
`reduceMotion` è `true` se l'utente ha attivato "riduci animazioni" nel sistema: in quel caso il carosello resta fermo e la modale si chiude subito.

### 3.2 Pulsante del tema (listener `click` su `themeButton`)

Legge il tema attuale, calcola quello opposto (`next`), lo scrive in `data-theme` e lo salva in `localStorage`.

### 3.3 `updateHeader()`

```js
header.classList.toggle('header-scrolled', window.scrollY > 0);
```

Aggiunge la classe `header-scrolled` se la pagina è scesa anche solo di 1 px, la toglie quando si torna in cima. Il CSS usa quella classe per sfondo verde, testo bianco e ombra. Viene chiamata:
- a ogni evento `scroll` (con `{ passive: true }` per non rallentare lo scroll);
- una volta subito, nel caso la pagina si apra già scrollata.

### 3.4 Animazione di comparsa delle card (reveal)

Si svolge in tre passi:

1. **Preparazione**: ogni figlio di ogni `.grid` riceve la classe `reveal` (nascosto) e la variabile CSS `--i` = `i % 3` (0, 1, 2). Il CSS la moltiplica per un ritardo (120 ms) per far comparire le card di una riga una dopo l'altra.
2. **`revealObserver`** (`IntersectionObserver`): avvisa quando una card entra nello schermo. Con `threshold: 0.15` basta che se ne veda il 15%. Quando succede aggiunge `is-visible` (parte l'animazione `rise` del CSS) e smette di osservare quella card (`unobserve`), così l'animazione parte una volta sola.
3. **Osservazione**: tutte le `.reveal` vengono messe sotto osservazione.

### 3.5 Carosello infinito e continuo

L'idea: le recensioni vengono **duplicate**. Il carosello scorre piano; quando arriva alla copia si toglie la larghezza di un giro e si torna all'inizio. Il contenuto è identico, quindi non si vede nessun salto.

| Nome | Cosa fa |
|------|---------|
| `SPEED` | Velocità in pixel al secondo (40). Più alto = più veloce. |
| `originals` | Le recensioni scritte nell'HTML, prima di duplicarle. |
| `addCopy()` | Clona tutte le recensioni e le aggiunge in fondo. Le copie hanno `aria-hidden="true"` così gli screen reader non leggono doppioni. |
| `loopWidth()` | Larghezza di un "giro": distanza tra la prima recensione e la sua copia (`offsetLeft`). |
| `maxScroll()` | Quanto si può scorrere al massimo (`scrollWidth - clientWidth`). |
| `fillCopies()` | Aggiunge la prima copia e, se serve, altre (massimo 6) finché c'è abbastanza contenuto da coprire anche gli schermi molto larghi. Si richiama anche al `resize`. |
| `position` | Posizione **con i decimali**. `scrollLeft` arrotonda ai pixel interi e a bassa velocità il movimento andrebbe a scatti. |
| `paused`, `resumeTimer` | Stato di pausa e timer per la ripartenza. |
| `pause()` | Ferma lo scorrimento e annulla il timer di ripartenza. |
| `resume(delay)` | Dopo `delay` ms riparte, prendendo come posizione quella attuale (`scrollLeft`): così riparte da dove l'utente ha lasciato. |
| Listener `mouseenter`/`focusin`/`touchstart` | Chiamano `pause`. |
| Listener `mouseleave`/`focusout` | Chiamano `resume()` subito. |
| Listener `touchend` | Chiama `resume(2000)`: sul telefono riparte dopo 2 secondi. |
| Listener `scroll` | Quando il carosello è in pausa e l'utente scorre a mano oltre la copia, dopo 150 ms (quando smette di scorrere) toglie `loopWidth()` e torna indietro senza salti visibili. Quando è in movimento automatico non serve, perché se ne occupa `tick()`. |
| `lastTime` | Istante dell'ultimo fotogramma. |
| `tick(time)` | Il "motore": viene chiamata a ogni fotogramma (~60 volte al secondo) con `requestAnimationFrame`. Si muove solo se non è in pausa, non c'è "riduci animazioni" e la scheda è visibile. Calcola i millisecondi trascorsi (massimo 50, per evitare salti dopo una pausa del browser), aumenta `position` di `SPEED × secondi`, se supera `loopWidth()` toglie un giro, e scrive `carousel.scrollLeft = position`. Poi prenota il fotogramma successivo. |

Nel CSS lo `scroll-snap` è stato tolto dal carosello: con lo snap il browser "raddrizzava" la posizione a ogni passo e il movimento non era fluido.

### 3.6 Modale "Richiedi preventivo"

| Nome | Cosa fa |
|------|---------|
| `closeTimer` | Timer della chiusura automatica dopo l'invio. |
| `clearErrors()` | Toglie `is-invalid` dai campi e svuota i messaggi di errore. |
| `closeModal()` | Chiusura con dissolvenza: annulla `closeTimer`; se la modale è già chiusa o già in chiusura non fa nulla; aggiunge `is-closing` (parte `modal-out` nel CSS) e dopo **250 ms** (0 se "riduci animazioni") toglie la classe e chiama `modal.close()`. I 250 ms devono coincidere con la durata dell'animazione nel CSS. |
| Listener su `.open-modal` | Pulisce `is-closing`/`is-done`, svuota il form (`reset`), cancella gli errori, apre con `showModal()` e mette il cursore sul nome. |
| Listener su `.close-modal` | Chiama `closeModal` (la × e il pulsante "Chiudi"). |
| Listener `click` sulla modale | Se il clic è sul fondo scuro (`event.target === modal`) chiude. I clic dentro il contenuto non contano. |
| Listener `cancel` | Scatta con il tasto **Esc**. `preventDefault()` blocca la chiusura brusca del browser e si usa `closeModal()` per avere la dissolvenza. |
| Listener `input` sui campi | Appena si riprende a scrivere, gli errori spariscono. |
| Listener `submit` del form | `preventDefault()` evita il ricaricamento. Controlla che il nome non sia vuoto e che l'email abbia il formato `qualcosa@dominio.estensione` (espressione regolare). Se qualcosa non va: aggiunge `is-invalid`, scrive il messaggio, mette il cursore sul primo campo sbagliato e si ferma. Se è tutto giusto: aggiunge `is-done` (compare "Richiesta inviata") e dopo **2,5 secondi** chiama `closeModal`. |

---

## Tabella id usati dal JS

| id | Dove | Usato per |
|----|------|-----------|
| `mainHeader` | header | classe `header-scrolled` |
| `themeButton` | pulsante luna/sole | cambio tema |
| `reviewsCarousel` | contenitore recensioni | carosello |
| `quoteModal` | `<dialog>` | modale |
| `quoteForm` | `<form>` nella modale | invio e reset |
| `nameInput`, `emailInput` | campi | validazione |
| `nameError`, `emailError` | testi di errore | messaggi |

Altri riferimenti: classi `.grid` (animazione di comparsa), `.open-modal` e `.close-modal` (pulsanti della modale).

## Classi che il JS aggiunge e dove le usa il CSS

| Classe | Aggiunta a | Effetto nel CSS |
|--------|-----------|-----------------|
| `reveal` | figli di `.grid` | stato iniziale nascosto |
| `is-visible` | card `.reveal` | fa partire `rise` |
| `header-scrolled` | `#mainHeader` | sfondo verde, testo bianco, ombra |
| `is-closing` | `#quoteModal` | animazione di uscita (`modal-out`) |
| `is-done` | `#quoteModal` | mostra la vista "Richiesta inviata" |
| `is-invalid` | `#nameInput`, `#emailInput` | bordo rosso |

## Valori facili da cambiare

| Cosa | Dove | Valore attuale |
|------|------|----------------|
| Velocità del carosello | `SPEED` | `40` px/s |
| Ritardo a scalare delle card | `i % 3` (JS) e il ritardo in `style.css` | 3 card, 120 ms |
| Quando compaiono le card | `threshold` | `0.15` (15%) |
| Ripartenza del carosello su tocco | `resume(2000)` | 2000 ms |
| Chiusura automatica della modale | `setTimeout(closeModal, 2500)` | 2500 ms |
| Durata dissolvenza in chiusura | `250` in `closeModal` | 250 ms (uguale al CSS) |