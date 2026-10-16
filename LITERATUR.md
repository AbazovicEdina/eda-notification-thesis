# Literatur zu den methodischen Entscheidungen

Quellen, auf die sich `DECISIONS.md` bezieht, geordnet nach Themenblock. Pro Quelle sind die vollständige Angabe, der Verwendungszweck und ein BibTeX-Eintrag angegeben. Die Angaben wurden per Websuche gegengeprüft (Stand: 2026-08-25, Ergänzungen 2026-10-16). Angaben, die nicht direkt an einer Verlags- oder Primärquelle bestätigt werden konnten, sind mit **„vor Abgabe prüfen"** gekennzeichnet.

---

## Empirische Softwaretechnik — Validitätsrahmen

### Wohlin et al. (2024) — Experimentaldesign und Validität

Claes Wohlin, Per Runeson, Martin Höst, Magnus C. Ohlsson, Björn Regnell, Anders Wesslén. *Experimentation in Software Engineering*, 2. Auflage. Springer, 2024. ISBN 978-3-662-69305-6. (Erstauflage 2000/2012; die Kapitelstruktur zu den Validitätsarten ist stabil.)

Verwendung: Rahmen aus Konstrukt-, interner, externer und statistischer Schlussfolgerungsvalidität (DECISIONS.md 5.8).

```bibtex
@book{wohlin2024experimentation,
  author    = {Wohlin, Claes and Runeson, Per and H{\"o}st, Martin and
               Ohlsson, Magnus C. and Regnell, Bj{\"o}rn and Wessl{\'e}n, Anders},
  title     = {Experimentation in Software Engineering},
  edition   = {2},
  publisher = {Springer},
  year      = {2024},
  isbn      = {978-3-662-69305-6}
}
```

### Arcuri & Briand (2014) — Statistische Tests in der SE-Forschung

Andrea Arcuri, Lionel Briand. „A Hitchhiker's Guide to Statistical Tests for Assessing Randomized Algorithms in Software Engineering." *Software Testing, Verification and Reliability*, 24(3), 219–250, 2014. DOI: 10.1002/stvr.1486.

Verwendung: Signifikanztests stets zusammen mit einer Effektstärke berichten; statistische Signifikanz allein belegt keine praktische Relevanz (DECISIONS.md 5.8).

```bibtex
@article{arcuri2014hitchhiker,
  author  = {Arcuri, Andrea and Briand, Lionel},
  title   = {A Hitchhiker's Guide to Statistical Tests for Assessing
             Randomized Algorithms in Software Engineering},
  journal = {Software Testing, Verification and Reliability},
  volume  = {24},
  number  = {3},
  pages   = {219--250},
  year    = {2014},
  doi     = {10.1002/stvr.1486}
}
```

## Signifikanztest

### Wilcoxon (1945) — Vorzeichen-Rang-Test

Frank Wilcoxon. „Individual Comparisons by Ranking Methods." *Biometrics Bulletin*, 1(6), 80–83, 1945.

Verwendung: gepaarter Signifikanztest (DECISIONS.md 5.8) auf den Laufpaaren des alternierenden Designs; verteilungsfrei, ohne Normalverteilungsannahme. Implementierung: `tools/orchestrate/stats.js` (`wilcoxonSignedRank`), exakte Nullverteilung bis 50 Paare ohne Bindungen, sonst Normalapproximation mit Stetigkeits- und Bindungskorrektur. Nicht zu verwechseln mit dem ungepaarten Rangsummentest aus derselben Arbeit.

```bibtex
@article{wilcoxon1945individual,
  author  = {Wilcoxon, Frank},
  title   = {Individual Comparisons by Ranking Methods},
  journal = {Biometrics Bulletin},
  volume  = {1},
  number  = {6},
  pages   = {80--83},
  year    = {1945}
}
```

### Mann & Whitney (1947) — ungepaarter U-Test (ersetzt)

Henry B. Mann, Donald R. Whitney. „On a Test of Whether one of Two Random Variables is Stochastically Larger than the Other." *The Annals of Mathematical Statistics*, 18(1), 50–60, 1947. DOI: 10.1214/aoms/1177730491.

Status: bis 2026-10-16 vorgesehenes Verfahren, ersetzt durch den gepaarten Wilcoxon-Test, der die Paarstruktur des alternierenden Designs nutzt. Dokumentiert, damit die Revision der Entscheidung nachvollziehbar bleibt.

```bibtex
@article{mann1947test,
  author  = {Mann, H. B. and Whitney, D. R.},
  title   = {On a Test of Whether one of Two Random Variables is
             Stochastically Larger than the Other},
  journal = {The Annals of Mathematical Statistics},
  volume  = {18},
  number  = {1},
  pages   = {50--60},
  year    = {1947},
  doi     = {10.1214/aoms/1177730491}
}
```

### Armitage, McPherson & Rowe (1969) — wiederholtes Testen auf anwachsenden Daten

P. Armitage, C. K. McPherson, B. C. Rowe. „Repeated Significance Tests on Accumulating Data." *Journal of the Royal Statistical Society, Series A (General)*, 132(2), 235–244, 1969. DOI: vor Abgabe prüfen (Crossref oder JSTOR).

Verwendung: Begründung, warum Zwischenauswertungen in den Hauptkampagnen kein Abbruchkriterium sind und die Wiederholungszahl vorab aus einem Pilot festgelegt wird (DECISIONS.md 5.9). Wird auf anwachsenden Daten wiederholt getestet und bei Signifikanz abgebrochen, steigt die Fehlerrate erster Art deutlich über das nominelle Niveau.

```bibtex
@article{armitage1969repeated,
  author  = {Armitage, P. and McPherson, C. K. and Rowe, B. C.},
  title   = {Repeated Significance Tests on Accumulating Data},
  journal = {Journal of the Royal Statistical Society. Series A (General)},
  volume  = {132},
  number  = {2},
  pages   = {235--244},
  year    = {1969}
}
```

## Effektstärke

### Cliff (1993) — Cliff's Delta

Norman Cliff. „Dominance Statistics: Ordinal Analyses to Answer Ordinal Questions." *Psychological Bulletin*, 114(3), 494–509, 1993.

Verwendung: eingeordnetes Effektmaß (DECISIONS.md 5.8). Ordinal, ohne Intervallskalen-Annahme wie bei Cohen's d, und damit für Latenzdaten geeigneter als parametrische Effektmaße.

```bibtex
@article{cliff1993dominance,
  author  = {Cliff, Norman},
  title   = {Dominance Statistics: Ordinal Analyses to Answer Ordinal
             Questions},
  journal = {Psychological Bulletin},
  volume  = {114},
  number  = {3},
  pages   = {494--509},
  year    = {1993}
}
```

### Romano, Kromrey, Coraggio & Skowronek (2006) — Schwellenwerte für Cliff's Delta

Jeanine Romano, Jeffrey D. Kromrey, Jesse Coraggio, Jeff Skowronek. „Appropriate Statistics for Ordinal Level Data: Should We Really Be Using t-test and Cohen's d for Evaluating Group Differences on the NSSE and Other Surveys?" Vortrag, Annual Meeting of the Florida Association of Institutional Research, 2006.

Verwendung: vorab festgelegte Schwellenwerte (|δ| < 0,147 vernachlässigbar; < 0,33 klein; < 0,474 mittel; sonst groß; DECISIONS.md 5.8). Hinweis: Tagungsbeitrag ohne Peer-Review in einer Zeitschrift; die Schwellen haben sich u. a. über Arcuri & Briand (2014) in der empirischen Softwaretechnik etabliert. Das kann in der Arbeit transparent erwähnt werden.

```bibtex
@inproceedings{romano2006appropriate,
  author    = {Romano, Jeanine and Kromrey, Jeffrey D. and Coraggio, Jesse
               and Skowronek, Jeff},
  title     = {Appropriate Statistics for Ordinal Level Data: Should We
               Really Be Using t-test and Cohen's d for Evaluating Group
               Differences on the {NSSE} and Other Surveys?},
  booktitle = {Annual Meeting of the Florida Association of Institutional
               Research},
  year      = {2006}
}
```

### Kerby (2014) — rangbiseriale Korrelation für gepaarte Daten

Dave S. Kerby. „The Simple Difference Formula: An Approach to Teaching Nonparametric Correlation." *Comprehensive Psychology*, 3, 2014. DOI: 10.2466/11.IT.3.1 (aus Sekundärquelle; vor Abgabe prüfen).

Verwendung: zusätzlich zu Cliff's Delta ausgegebenes Effektmaß r = (W⁺ − W⁻) / (W⁺ + W⁻), das direkt zum Wilcoxon-Vorzeichen-Rang-Test passt: Anteil der Rangsumme, der für eine Richtung spricht, minus Anteil, der dagegen spricht (DECISIONS.md 5.8).

```bibtex
@article{kerby2014simple,
  author  = {Kerby, Dave S.},
  title   = {The Simple Difference Formula: An Approach to Teaching
             Nonparametric Correlation},
  journal = {Comprehensive Psychology},
  volume  = {3},
  year    = {2014},
  doi     = {10.2466/11.IT.3.1}
}
```

### Vargha & Delaney (2000) — verwandtes Maß, zur Abgrenzung

András Vargha, Harold D. Delaney. „A Critique and Improvement of the CL Common Language Effect Size Statistics of McGraw and Wong." *Journal of Educational and Behavioral Statistics*, 25(2), 101–132, 2000. DOI: 10.3102/10769986025002101.

Verwendung: Abgrenzung, nicht Quelle der verwendeten Schwellen. Das Maß A₁₂ ist mathematisch äquivalent zu Cliff's Delta (δ = 2·A₁₂ − 1), Vargha & Delaney verwenden jedoch eigene, leicht abweichende Schwellen.

```bibtex
@article{vargha2000critique,
  author  = {Vargha, Andr{\'a}s and Delaney, Harold D.},
  title   = {A Critique and Improvement of the {CL} Common Language
             Effect Size Statistics of {M}c{G}raw and Wong},
  journal = {Journal of Educational and Behavioral Statistics},
  volume  = {25},
  number  = {2},
  pages   = {101--132},
  year    = {2000},
  doi     = {10.3102/10769986025002101}
}
```

## Mehrfachvergleiche

### Holm (1979) — Holm-Bonferroni-Korrektur

Sture Holm. „A Simple Sequentially Rejective Multiple Test Procedure." *Scandinavian Journal of Statistics*, 6(2), 65–70, 1979.

Verwendung: Korrektur je Testfamilie über 24 geplante Tests (8 Vergleiche × 3 Laststufen; DECISIONS.md 5.8, 5.15). Kontrolliert die familienweise Fehlerrate bei beliebiger Abhängigkeit der Tests und ist trennschärfer als die Bonferroni-Korrektur. Implementierung: `holmCorrection` in `tools/orchestrate/stats.js`.

```bibtex
@article{holm1979simple,
  author  = {Holm, Sture},
  title   = {A Simple Sequentially Rejective Multiple Test Procedure},
  journal = {Scandinavian Journal of Statistics},
  volume  = {6},
  number  = {2},
  pages   = {65--70},
  year    = {1979}
}
```

## Konfidenzintervalle

### Efron & Tibshirani (1993) — Bootstrap

Bradley Efron, Robert J. Tibshirani. *An Introduction to the Bootstrap*. Chapman & Hall, 1993. ISBN 978-0-412-04231-7.

Verwendung: 95-%-Konfidenzintervall für den Median der gepaarten Differenzen (nichtparametrischer Bootstrap, Perzentil-Methode, 10 000 Resamples mit festem Startwert; DECISIONS.md 5.8).

```bibtex
@book{efron1993bootstrap,
  author    = {Efron, Bradley and Tibshirani, Robert J.},
  title     = {An Introduction to the Bootstrap},
  publisher = {Chapman \& Hall},
  year      = {1993},
  isbn      = {978-0-412-04231-7}
}
```

## Messauflösung

### Widrow & Kollár (2008) — Quantisierungsrauschen

Bernard Widrow, István Kollár. *Quantization Noise: Roundoff Error in Digital Computation, Signal Processing, Control, and Communications*. Cambridge University Press, 2008. ISBN 978-0-521-88671-0. DOI: 10.1017/CBO9780511754661 (aus dem Schema der Kapitel-DOIs abgeleitet; vor Abgabe prüfen).

Verwendung: Begründung des Mittelwerts pro Lauf als Testgröße (DECISIONS.md 5.8). Werden Zeitstempel auf ganze Millisekunden gerundet und sind die Ereignisse nicht an das Millisekundenraster gekoppelt, ist der Rundungsfehler näherungsweise gleichverteilt und im Mittel null. Der Mittelwert vieler gerundeter Werte ist dann fein aufgelöst und unverzerrt, der Median dagegen bleibt an das Raster gebunden.

```bibtex
@book{widrow2008quantization,
  author    = {Widrow, Bernard and Koll{\'a}r, Istv{\'a}n},
  title     = {Quantization Noise: Roundoff Error in Digital Computation,
               Signal Processing, Control, and Communications},
  publisher = {Cambridge University Press},
  year      = {2008},
  isbn      = {978-0-521-88671-0}
}
```

## Pseudoreplikation und Analyseeinheit

### Hurlbert (1984) — Pseudoreplikation

Stuart H. Hurlbert. „Pseudoreplication and the Design of Ecological Field Experiments." *Ecological Monographs*, 54(2), 187–211, 1984.

Verwendung: Begründung, den k6-Lauf statt des Einzelereignisses als Analyseeinheit zu verwenden (DECISIONS.md 5.8). Die Grundaussage, dass abhängige Beobachtungen (hier: Events desselben Laufs mit gemeinsamem Prozesszustand und gemeinsamer Host-Auslastung) nicht als unabhängige Stichprobe in einen Test eingehen dürfen, ist disziplinübergreifend anerkannt. Die Übertragung aus der Ökologie auf Softwaremessungen sollte in der Arbeit kurz eingeordnet werden.

```bibtex
@article{hurlbert1984pseudoreplication,
  author  = {Hurlbert, Stuart H.},
  title   = {Pseudoreplication and the Design of Ecological Field
             Experiments},
  journal = {Ecological Monographs},
  volume  = {54},
  number  = {2},
  pages   = {187--211},
  year    = {1984}
}
```

## Methodik von Performance-Messungen

### Georges, Buytaert & Eeckhout (2007) — wiederholte Messungen, Warm-up

Andy Georges, Dries Buytaert, Lieven Eeckhout. „Statistically Rigorous Java Performance Evaluation." In *Proceedings of OOPSLA 2007*, 57–76, 2007.

Verwendung: wiederholte Läufe, Ausschluss von Warm-up-Läufen und nicht normalverteilte Messdaten (DECISIONS.md 5.8, 5.9). Die Arbeit bezieht sich auf JVM-Benchmarks; das Grundproblem (Nichtdeterminismus durch JIT, Garbage Collection, Scheduling) ist auf OPcache, den JIT von V8, Verbindungsaufbau und Dateisystem-Cache übertragbar.

```bibtex
@inproceedings{georges2007statistically,
  author    = {Georges, Andy and Buytaert, Dries and Eeckhout, Lieven},
  title     = {Statistically Rigorous Java Performance Evaluation},
  booktitle = {Proceedings of the 22nd ACM SIGPLAN Conference on
               Object-Oriented Programming Systems and Applications
               (OOPSLA)},
  pages     = {57--76},
  year      = {2007}
}
```

### Kalibera & Jones (2013) — Zahl der Wiederholungen

Tomas Kalibera, Richard Jones. „Rigorous Benchmarking in Reasonable Time." In *Proceedings of the 2013 International Symposium on Memory Management (ISMM)*, 63–74, 2013. DOI: 10.1145/2464157.2464160.

Verwendung: Festlegung der Wiederholungszahl aus Pilotdaten statt pauschal (DECISIONS.md 5.9). Der tatsächliche Nichtdeterminismus eines Benchmarks ist oft geringer als angenommen; Wiederholungen sind dort einzusetzen, wo die Unsicherheit tatsächlich liegt.

```bibtex
@inproceedings{kalibera2013rigorous,
  author    = {Kalibera, Tomas and Jones, Richard},
  title     = {Rigorous Benchmarking in Reasonable Time},
  booktitle = {Proceedings of the 2013 International Symposium on Memory
               Management (ISMM)},
  pages     = {63--74},
  year      = {2013},
  doi       = {10.1145/2464157.2464160}
}
```

## Latenz aus Nutzersicht

### Dean & Barroso (2013) — Tail-Latenz

Jeffrey Dean, Luiz André Barroso. „The Tail at Scale." *Communications of the ACM*, 56(2), 74–80, 2013. DOI: 10.1145/2408776.2408794.

Verwendung: Begründung, p95, p99 und Maximum zusätzlich zum Mittelwert pro Lauf zu berichten (DECISIONS.md 5.8). Tail-Latenzen sind bei vielen gleichzeitigen Verbindungen für Nutzer oft wichtiger als der Durchschnitt.

```bibtex
@article{dean2013tail,
  author  = {Dean, Jeffrey and Barroso, Luiz Andr{\'e}},
  title   = {The Tail at Scale},
  journal = {Communications of the ACM},
  volume  = {56},
  number  = {2},
  pages   = {74--80},
  year    = {2013},
  doi     = {10.1145/2408776.2408794}
}
```

### Nielsen (1993) — Grenzen der Antwortzeit

Jakob Nielsen. *Usability Engineering*. Academic Press, Boston, 1993. Kapitel 5 (Antwortzeiten). ISBN 0-12-518405-0 (Verlag und ISBN vor Abgabe prüfen). Die drei Grenzen (0,1 s, 1 s, 10 s) sind vom Autor auch online zusammengefasst: nngroup.com/articles/response-times-3-important-limits.

Verwendung: Latenzgrenze von 1 000 ms im Sättigungskriterium (DECISIONS.md 5.17). Bis etwa eine Sekunde unterbricht eine Verzögerung den Gedankenfluss von Nutzern nicht.

```bibtex
@book{nielsen1993usability,
  author    = {Nielsen, Jakob},
  title     = {Usability Engineering},
  publisher = {Academic Press},
  address   = {Boston},
  year      = {1993},
  isbn      = {0-12-518405-0}
}
```

## Containervirtualisierung — externe Validität

### Felter, Ferreira, Rajamony & Rubio (2015) — Overhead von Docker

Wes Felter, Alexandre Ferreira, Ram Rajamony, Juan Rubio. „An Updated Performance Comparison of Virtual Machines and Linux Containers." In *Proceedings of ISPASS 2015*, 171–172, 2015.

Verwendung: Docker führt einen messbaren, für PHP und Node.js aber symmetrischen Overhead ein und verzerrt den Vergleich daher nicht. Für die externe Validität: Die Ergebnisse gelten für PHP und Node.js unter Docker, nicht ohne Weiteres für Bare-Metal-Betrieb.

```bibtex
@inproceedings{felter2015updated,
  author    = {Felter, Wes and Ferreira, Alexandre and Rajamony, Ram and
               Rubio, Juan},
  title     = {An Updated Performance Comparison of Virtual Machines and
               Linux Containers},
  booktitle = {Proceedings of the IEEE International Symposium on
               Performance Analysis of Systems and Software (ISPASS)},
  pages     = {171--172},
  year      = {2015}
}
```

## Protokoll-Spezifikationen

### RFC 6455 — WebSocket-Protokoll

I. Fette, A. Melnikov. „The WebSocket Protocol." RFC 6455, IETF, Dezember 2011. DOI: 10.17487/RFC6455.

Verwendung: formale Definition von WebSocket; Abgrenzung zum Pusher-Channels-Protokoll, das Laravel Reverb zusätzlich verwendet (`prototypes/php-laravel/README.md`).

```bibtex
@techreport{fette2011websocket,
  author      = {Fette, I. and Melnikov, A.},
  title       = {The WebSocket Protocol},
  institution = {IETF},
  number      = {RFC 6455},
  year        = {2011},
  doi         = {10.17487/RFC6455}
}
```

### WHATWG HTML Living Standard — Server-Sent Events

WHATWG. „9.2 Server-Sent Events." *HTML Living Standard*. https://html.spec.whatwg.org/multipage/server-sent-events.html (fortlaufend aktualisiert; Abrufdatum angeben).

Verwendung: formale Definition von SSE. Anders als WebSocket ist SSE kein IETF-RFC, sondern Teil des WHATWG-Standards; dieser Unterschied im Publikationsstatus kann in der Arbeit kurz erwähnt werden.

```bibtex
@misc{whatwg-sse,
  author       = {{WHATWG}},
  title        = {{HTML} Living Standard --- 9.2 Server-Sent Events},
  howpublished = {\url{https://html.spec.whatwg.org/multipage/server-sent-events.html}},
  note         = {Abgerufen 2026-08-25}
}
```

### RFC 5905 — Network Time Protocol Version 4

D. Mills, J. Burbank, W. Kasch. „Network Time Protocol Version 4: Protocol and Algorithms Specification." RFC 5905, IETF, Juni 2010. DOI: 10.17487/RFC5905.

Verwendung: Begründung, warum Sende- und Empfangszeitstempel vom selben Gerät stammen (Lastgenerator, DECISIONS.md 5.14). Eine Uhrensynchronisation zwischen Geräten per NTP erreicht nicht zuverlässig die hier benötigte Genauigkeit unterhalb einer Millisekunde.

```bibtex
@techreport{mills2010ntp,
  author      = {Mills, D. and Burbank, J. and Kasch, W.},
  title       = {Network Time Protocol Version 4: Protocol and Algorithms
                 Specification},
  institution = {IETF},
  number      = {RFC 5905},
  year        = {2010},
  doi         = {10.17487/RFC5905}
}
```

## Technische Referenzdokumentation (Debugging- und Monitoring-Vergleich)

Offizielle Werkzeugdokumentation als Beleg für den Vergleich in DECISIONS.md 5.13.

### Node.js — Debugger und Inspector

Node.js-Projekt. „Debugger" und „Inspector", *Node.js API-Dokumentation*. https://nodejs.org/api/debugger.html

Verwendung: Der Schritt-Debugger (`--inspect`, V8 Inspector / Chrome-DevTools-Protokoll) ist Bestandteil des Node.js-Kerns.

```bibtex
@misc{nodejs-debugger,
  author       = {{Node.js-Projekt}},
  title        = {Debugger --- {N}ode.js {API} Documentation},
  howpublished = {\url{https://nodejs.org/api/debugger.html}},
  note         = {Abgerufen 2026-08-25}
}
```

### Xdebug — Installation

Derick Rethans. *Xdebug Documentation — Installation*. https://xdebug.org/docs/install

Verwendung: Xdebug ist eine separate PECL-Erweiterung und wird nicht mit PHP ausgeliefert.

```bibtex
@misc{xdebug-install,
  author       = {Rethans, Derick},
  title        = {Xdebug Documentation --- Installation},
  howpublished = {\url{https://xdebug.org/docs/install}},
  note         = {Abgerufen 2026-08-25}
}
```

---

## Übersicht: Quelle je Entscheidung

| DECISIONS.md | Entscheidung | Quelle(n) |
| ------------ | ------------ | --------- |
| 5.8 | Analyseeinheit k6-Lauf | Hurlbert (1984) |
| 5.8 | Mittelwert pro Lauf als Testgröße | Widrow & Kollár (2008) |
| 5.8 | Wilcoxon-Vorzeichen-Rang-Test (gepaart) | Wilcoxon (1945); Arcuri & Briand (2014) |
| 5.8 | Mann-Whitney-U-Test (ersetzt) | Mann & Whitney (1947) |
| 5.8 | Cliff's Delta und Schwellen | Cliff (1993); Romano et al. (2006); vgl. Vargha & Delaney (2000) |
| 5.8 | Rangbiseriale Korrelation (gepaart) | Kerby (2014) |
| 5.8 | Bootstrap-Konfidenzintervall | Efron & Tibshirani (1993) |
| 5.8 | Holm-Korrektur je Familie | Holm (1979) |
| 5.8 | Tail-Latenzen berichten | Dean & Barroso (2013) |
| 5.8 | nichtparametrisches Vorgehen | Georges et al. (2007); Kalibera & Jones (2013) |
| 5.8, 5.9 | Validitätsrahmen | Wohlin et al. (2024) |
| 5.9 | Warm-up, Wiederholungszahl aus Pilot | Georges et al. (2007); Kalibera & Jones (2013) |
| 5.9 | kein Abbruch nach Zwischenauswertung | Armitage et al. (1969) |
| 5.14 | Zeitstempel vom selben Gerät | RFC 5905 |
| 5.17 | Latenzgrenze im Sättigungskriterium | Nielsen (1993) |
| externe Validität | Docker als symmetrischer Einflussfaktor | Felter et al. (2015) |
| Konstruktvalidität | Definition von WebSocket und SSE | RFC 6455; WHATWG HTML Living Standard |
| 5.13 | Debugger und Profiler eingebaut bzw. Zusatzinstallation | Node.js-Dokumentation; Xdebug-Dokumentation |
