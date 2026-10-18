# Literatur

Quellen zu den verwandten Arbeiten und zu den Entscheidungen in `DECISIONS.md`, geordnet nach Themenblock. Pro Quelle sind die vollständige Angabe, der Verwendungszweck und ein BibTeX-Eintrag angegeben. Die Angaben wurden per Websuche gegengeprüft (Stand: 2026-08-25, Ergänzungen 2026-10-16, 2026-10-17 und 2026-10-18). Die BibTeX-Einträge folgen den Empfehlungen der HagenbergThesis-Vorlage für biblatex (`date`, `journaltitle`, `urldate`, `langid`, Online-Quellen als `@online`, keine ISBN) und lassen sich unverändert in die `.bib`-Datei der Arbeit übernehmen. Am 2026-10-17 wurden alle Fundstellen mit DOI über Crossref, Bücher ohne DOI über Open Library bzw. den Verlag bestätigt; offene Prüfvermerke gibt es nicht mehr. Online-Quellen tragen ihr Abrufdatum. Inhaltliche Zusammenfassungen beruhen auf Abstracts und Katalogeinträgen; zitiert wird in der Arbeit nur, was selbst gelesen wurde.

Aufnahme neuer Quellen: Eine Quelle wird erst eingetragen, wenn Existenz und Metadaten (Autoren, Titel, Jahr, Erscheinungsort, Band, Seiten, DOI) über Crossref, arXiv, Open Library, rfc-editor.org oder die Verlagsseite bestätigt sind. Der Eintrag nennt die Aussage, die die Quelle in der Arbeit stützt. Ob die Quelle diese Aussage tatsächlich enthält, wird vor dem Zitieren im Original geprüft. Nicht bestätigte Angaben werden nicht übernommen.

---

## Verwandte Arbeiten

### Einordnung und Forschungslücke (Entwurf)

Die verwandten Arbeiten lassen sich vier Linien zuordnen:

1. **Nebenläufigkeitsmodelle von Servern:** Prozess- bzw. Thread-pro-Verbindung gegenüber ereignisgesteuerter Verarbeitung (Lauer & Needham 1979; Welsh et al. 2001; von Behren et al. 2003; Pariag et al. 2007). Diese Arbeiten liefern die theoretische Grundlage für den Vergleich von PHP-FPM (Worker pro Verbindung) und Node.js (Event Loop). Sie untersuchen Webserver mit kurzen Anfragen, nicht langlebige Push-Verbindungen.
2. **PHP gegenüber Node.js:** Bestehende Vergleiche (z. B. Lei, Ma & Tan 2014) messen klassische Anfrage-Antwort-Lasten. Node.js wird dort als ereignisgesteuerte Plattform für ein- und ausgabelastige Anwendungen beschrieben (Tilkov & Vinoski 2010).
3. **Ereignisgesteuerte Architektur:** Begriffe und Muster (Fowler 2017; Hohpe & Woolf 2003), Auswirkungen auf Modularität (Farias & Lazzari 2023) und Performance (Cabane & Farias 2024), Herausforderungen bei Überwachung und Fehlersuche (Laigner et al. 2026), Performance-Modelle (Woodside 2021). Diese Arbeiten betrachten die Kommunikation zwischen Diensten, nicht die Zustellung an viele dauerhaft verbundene Clients.
4. **Echtzeit im Web:** WebSockets sind verbreitet, Polling ist aber weiterhin häufiger (Murley et al. 2021). Eine begutachtete Studie, die SSE und WebSocket unter kontrollierten Bedingungen gegenüberstellt, wurde in der Websuche (2026-10-16) nicht gefunden; die verfügbaren Vergleiche sind Blog- und Herstellerbeiträge.

**Lücke (vorläufig, durch Recherche in IEEE Xplore, ACM Digital Library und Google Scholar zu bestätigen):** Ein kontrollierter Vergleich von PHP und Node.js bei der Zustellung von Server-Push-Nachrichten über langlebige Verbindungen (SSE und WebSocket), bei dem das Nebenläufigkeitsmodell am stärksten ins Gewicht fällt, getrennt nach Sprache, Framework und Queue, mit vorab festgelegtem Auswerteplan, liegt in dieser Form nicht vor.

### Lauer & Needham (1979) — Dualität von Nachrichten- und Prozedurmodell

Hugh C. Lauer, Roger M. Needham. „On the Duality of Operating System Structures." *ACM SIGOPS Operating Systems Review*, 13(2), 3–19, 1979 (Erstvorstellung 1978). DOI: 10.1145/850657.850658 (über Crossref bestätigt am 2026-10-17).

Inhalt laut Zusammenfassungen: Betriebssysteme lassen sich in nachrichtenorientierte (wenige Prozesse, expliziter Nachrichtenaustausch) und prozedurorientierte Systeme einteilen; beide Modelle sind zueinander dual, keines ist grundsätzlich überlegen.

Bezug: theoretischer Ausgangspunkt der Debatte „Threads gegen Events", in die sich der Vergleich PHP-FPM gegen Node.js einordnet.

```bibtex
@article{lauer1979duality,
  author       = {Lauer, Hugh C. and Needham, Roger M.},
  title        = {On the Duality of Operating System Structures},
  journaltitle = {ACM SIGOPS Operating Systems Review},
  volume       = {13},
  number       = {2},
  pages        = {3--19},
  date         = {1979},
  doi          = {10.1145/850657.850658},
  langid       = {english}
}
```

### Welsh, Culler & Brewer (2001) — SEDA

Matt Welsh, David Culler, Eric Brewer. „SEDA: An Architecture for Well-Conditioned, Scalable Internet Services." In *Proceedings of the 18th ACM Symposium on Operating Systems Principles (SOSP)*, 230–243, 2001. DOI: 10.1145/502034.502057.

Inhalt: Architektur für Internetdienste unter hoher Nebenläufigkeit, die Anfragen in ereignisgesteuerte Stufen mit Warteschlangen zerlegt.

Bezug: Ereignis- und Warteschlangen-Modell als Grundlage für ereignisgesteuerte Server und für die Queue-Achse der Arbeit.

```bibtex
@inproceedings{welsh2001seda,
  author    = {Welsh, Matt and Culler, David and Brewer, Eric},
  title     = {{SEDA}: An Architecture for Well-Conditioned, Scalable Internet Services},
  booktitle = {Proceedings of the 18th ACM Symposium on Operating Systems Principles (SOSP)},
  pages     = {230--243},
  date      = {2001},
  doi       = {10.1145/502034.502057},
  langid    = {english}
}
```

### von Behren, Condit & Brewer (2003) — Gegenposition zu ereignisgesteuerten Servern

Rob von Behren, Jeremy Condit, Eric Brewer. „Why Events Are A Bad Idea (for High-Concurrency Servers)." In *Proceedings of HotOS IX*, USENIX, 2003.

Inhalt laut Abstract: Threads können bei hoher Nebenläufigkeit mit Events gleichziehen und führen zu einfacherem Code; Schwächen von Threads liegen in einzelnen Implementierungen, nicht im Modell.

Bezug: Gegenposition, die in der Diskussion verhindert, das Ergebnis vorschnell als „Events sind grundsätzlich besser" zu verallgemeinern.

```bibtex
@inproceedings{vonbehren2003events,
  author    = {von Behren, Rob and Condit, Jeremy and Brewer, Eric},
  title     = {Why Events Are A Bad Idea (for High-Concurrency Servers)},
  booktitle = {Proceedings of the 9th Workshop on Hot Topics in Operating Systems (HotOS IX)},
  publisher = {USENIX},
  date      = {2003},
  langid    = {english}
}
```

### Pariag et al. (2007) — Vergleich von Webserver-Architekturen

David Pariag, Tim Brecht, Ashif Harji, Peter Buhr, Amol Shukla, David R. Cheriton. „Comparing the Performance of Web Server Architectures." In *Proceedings of EuroSys 2007*, 231–243, 2007. DOI: 10.1145/1272996.1273021 (über Crossref bestätigt am 2026-10-17).

Inhalt laut Zusammenfassung: Vergleich eines ereignisgesteuerten, eines Thread-pro-Verbindung- und eines Pipeline-Servers; die ereignisgesteuerte und die Pipeline-Variante erzielten rund 18 % höheren Durchsatz als die Thread-Variante.

Bezug: empirischer Vergleich der Nebenläufigkeitsmodelle unter kontrollierten Bedingungen, allerdings für kurze HTTP-Anfragen statt langlebiger Push-Verbindungen.

```bibtex
@inproceedings{pariag2007comparing,
  author    = {Pariag, David and Brecht, Tim and Harji, Ashif and Buhr, Peter and Shukla, Amol and Cheriton, David R.},
  title     = {Comparing the Performance of Web Server Architectures},
  booktitle = {Proceedings of the 2nd ACM SIGOPS/EuroSys European Conference on Computer Systems},
  pages     = {231--243},
  date      = {2007},
  doi       = {10.1145/1272996.1273021},
  langid    = {english}
}
```

### Tilkov & Vinoski (2010) — Node.js

Stefan Tilkov, Steve Vinoski. „Node.js: Using JavaScript to Build High-Performance Network Programs." *IEEE Internet Computing*, 14(6), 80–83, 2010. DOI: 10.1109/MIC.2010.145 (über Crossref bestätigt am 2026-10-17).

Inhalt laut Abstract: Node.js als Plattform für nebenläufige Netzwerkprogramme mit asynchroner Ein- und Ausgabe und ereignisgesteuertem Modell statt Multithreading.

Bezug: Einordnung von Node.js als Vertreter des ereignisgesteuerten Modells.

```bibtex
@article{tilkov2010nodejs,
  author       = {Tilkov, Stefan and Vinoski, Steve},
  title        = {Node.js: Using {JavaScript} to Build High-Performance Network Programs},
  journaltitle = {IEEE Internet Computing},
  volume       = {14},
  number       = {6},
  pages        = {80--83},
  date         = {2010},
  doi          = {10.1109/MIC.2010.145},
  langid       = {english}
}
```

### Lei, Ma & Tan (2014) — PHP, Python und Node.js im Vergleich

Kai Lei, Yining Ma, Zhi Tan. „Performance Comparison and Evaluation of Web Development Technologies in PHP, Python, and Node.js." In *Proceedings of the 2014 IEEE 17th International Conference on Computational Science and Engineering (CSE)*, 661–668, 2014. DOI: 10.1109/CSE.2014.142 (aus Kopien der Erstseite; vor Abgabe in IEEE Xplore prüfen).

Inhalt laut Schlussfolgerung: Node.js sei leichtgewichtig und effizient und eigne sich für ein- und ausgabelastige Anwendungen; PHP eher für kleine und mittlere Anwendungen.

Bezug und Abgrenzung: direktester Vorläufer des Sprachvergleichs; misst jedoch Anfrage-Antwort-Lasten, nicht Server-Push über langlebige Verbindungen, und trennt nicht nach Framework.

```bibtex
@inproceedings{lei2014performance,
  author    = {Lei, Kai and Ma, Yining and Tan, Zhi},
  title     = {Performance Comparison and Evaluation of Web Development Technologies in {PHP}, {Python}, and {Node.js}},
  booktitle = {2014 IEEE 17th International Conference on Computational Science and Engineering (CSE)},
  pages     = {661--668},
  date      = {2014},
  doi       = {10.1109/CSE.2014.142},
  langid    = {english}
}
```

### Murley et al. (2021) — Verbreitung von WebSockets

Paul Murley, Zane Ma, Joshua Mason, Michael Bailey, Amin Kharraz. „WebSocket Adoption and the Landscape of the Real-Time Web." In *Proceedings of the Web Conference 2021 (WWW '21)*, 1192–1203, 2021. DOI: 10.1145/3442381.3450063.

Inhalt laut Abstract: Auswertung der eine Million meistbesuchten Websites; Polling ist deutlich häufiger als WebSockets, deren Verbreitung zuletzt stagniert; empfohlene Sicherheitspraktiken werden oft nicht eingehalten.

Bezug: Einordnung der Relevanz von Echtzeitkommunikation im Web; belegt, dass Push-Techniken in der Praxis nicht selbstverständlich sind.

```bibtex
@inproceedings{murley2021websocket,
  author    = {Murley, Paul and Ma, Zane and Mason, Joshua and Bailey, Michael and Kharraz, Amin},
  title     = {{WebSocket} Adoption and the Landscape of the Real-Time Web},
  booktitle = {Proceedings of the Web Conference 2021 (WWW '21)},
  pages     = {1192--1203},
  date      = {2021},
  doi       = {10.1145/3442381.3450063},
  langid    = {english}
}
```

### Hohpe & Woolf (2003) — Enterprise Integration Patterns

Gregor Hohpe, Bobby Woolf. *Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions*. Addison-Wesley, 2003. ISBN 978-0-321-20068-6.

Inhalt: Katalog von Mustern für nachrichtenbasierte Integration, darunter Nachrichtenkanäle wie Publish-Subscribe.

Bezug: Begriffe und Grundlagen für Redis Pub/Sub und die Queues im Grundlagenkapitel.

```bibtex
@book{hohpe2003eip,
  author    = {Hohpe, Gregor and Woolf, Bobby},
  title     = {Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions},
  publisher = {Addison-Wesley},
  date      = {2003},
  langid    = {english}
}
```

---

## Ereignisgesteuerte Architektur (Quellen aus dem Exposé)

Das Exposé nennt zehn Quellen. Drei davon stehen bereits an anderer Stelle (Hohpe & Woolf 2003, Laravel Queues, WHATWG Server-Sent Events). Die übrigen wurden am 2026-10-17 einzeln geprüft: Fundstelle über Crossref, arXiv bzw. Verlagsseite, Inhalt über das Abstract. Übernommen werden nur Quellen, die eine konkrete Aussage der Arbeit stützen. Zwei Angaben des Exposés sind dabei korrigiert (Laigner et al., Farias & Lazzari), eine Quelle wird nicht übernommen (Tzialla et al., siehe unten).

### Fielding (2000) — REST und ereignisbasierte Integration

Roy Thomas Fielding. *Architectural Styles and the Design of Network-based Software Architectures*. Dissertation, University of California, Irvine, 2000.

Inhalt: Ableitung des Architekturstils REST aus netzwerkbasierten Architekturstilen. Abschnitt 3.6.1 beschreibt den Stil „Event-based Integration" mit seinen Vor- und Nachteilen.

Verwendung: Definition des Anfrage-Antwort-Modells des Webs (REST, vom Client ausgelöste Interaktion) als Gegenstück zu Push-Verfahren im Grundlagenkapitel; Einordnung ereignisbasierter Integration (Abschnitt 3.6.1). Die Aussage des Exposés, Anfrage-Antwort-Architekturen stießen bei häufigen Aktualisierungen an Grenzen, ist in dieser Form nicht direkt aus Fielding belegbar; zitiert wird die Definition, nicht eine Bewertung.

```bibtex
@thesis{fielding2000rest,
  author      = {Fielding, Roy Thomas},
  title       = {Architectural Styles and the Design of Network-based Software Architectures},
  type        = {phdthesis},
  institution = {University of California, Irvine},
  date        = {2000},
  url         = {https://ics.uci.edu/~fielding/pubs/dissertation/top.htm},
  urldate     = {2026-10-17},
  langid      = {english}
}
```

### Fowler (2017) — Bedeutungen von „event-driven"

Martin Fowler. „What do you mean by ‚Event-Driven'?" Blogbeitrag, 2017. https://martinfowler.com/articles/201701-event-driven.html

Inhalt: Unterscheidung von vier Mustern, die unter „event-driven" zusammengefasst werden: Event Notification, Event-Carried State Transfer, Event Sourcing und CQRS.

Verwendung: Begriffsklärung im Grundlagenkapitel. Das untersuchte System entspricht dem Muster Event Notification mit Nutzdaten im Event (jeder Scan wird an alle Clients verteilt). Hinweis: kein begutachteter Beitrag; geeignet für Begriffe, nicht als Beleg für empirische Aussagen.

```bibtex
@online{fowler2017eventdriven,
  author  = {Fowler, Martin},
  title   = {What do you mean by ``Event-Driven''?},
  date    = {2017-02-07},
  url     = {https://martinfowler.com/articles/201701-event-driven.html},
  urldate = {2026-10-17},
  langid  = {english}
}
```

Datum des Beitrags (7. Februar 2017) auf der Seite geprüft am 2026-10-17.

### Laigner, Almeida, Assunção & Zhou (2026) — Herausforderungen ereignisbasierter Kommunikation

Rodrigo Laigner, Ana Carolina Almeida, Wesley K. G. Assunção, Yongluan Zhou. „An Empirical Study on Challenges of Event Management in Microservice Architectures." *ACM Transactions on Software Engineering and Methodology*, 35(8), 1–62, 2026. DOI: 10.1145/3776581. Vorabfassung: arXiv:2408.00440 (2024).

Korrektur gegenüber dem Exposé: Das Exposé nennt SIGMOD 2024. Die Arbeit ist als arXiv-Vorabfassung 2024 erschienen und 2026 in ACM TOSEM veröffentlicht; zitiert wird die veröffentlichte Fassung.

Inhalt laut Abstract: empirische Untersuchung der Praktiken und Herausforderungen beim Entwerfen, Umsetzen, Testen, Überwachen und Fehlersuchen ereignisbasierter Kommunikation zwischen Microservices.

Verwendung: Motivation (Ereignisse entkoppeln, bringen aber Schwierigkeiten bei Fehlersuche und Überwachung) und Einordnung von RQ3 sowie des Debugging- und Monitoring-Vergleichs (DECISIONS.md 5.13, 5.22).

```bibtex
@article{laigner2026event,
  author       = {Laigner, Rodrigo and Almeida, Ana Carolina and Assunção, Wesley K. G. and Zhou, Yongluan},
  title        = {An Empirical Study on Challenges of Event Management in Microservice Architectures},
  journaltitle = {ACM Transactions on Software Engineering and Methodology},
  volume       = {35},
  number       = {8},
  pages        = {1--62},
  date         = {2026},
  doi          = {10.1145/3776581},
  langid       = {english}
}
```

### Farias & Lazzari (2023) — ereignisgesteuerte Architektur und Modularität

Kleinner Farias, Luan Lazzari. „Event-driven Architecture and REST Architectural Style: An Exploratory Study on Modularity." *Journal of Applied Research and Technology*, 21(3), 338–351, 2023. DOI: 10.22201/icat.24486736e.2023.21.3.1764. Vorabfassung: L. Lazzari, K. Farias, arXiv:2110.14699 (2021).

Korrektur gegenüber dem Exposé: Das Exposé zitiert die arXiv-Vorabfassung. Die begutachtete Fassung ist 2023 in einer Zeitschrift erschienen, mit geändertem Titel und Farias als Erstautor; nach den Regeln der Vorlage wird die veröffentlichte Fassung zitiert.

Inhalt laut Abstract: exploratorische Studie, die eine ereignisgesteuerte und eine REST-basierte Umsetzung derselben Anwendung hinsichtlich Trennung der Belange, Kopplung, Kohäsion, Komplexität und Größe vergleicht.

Verwendung: Einordnung von RQ3 (Komplexität und Wartbarkeit) und der Code-Kennzahlen (DECISIONS.md 5.22); verwandte Arbeit, die Wartbarkeit ebenfalls über Code-Kennzahlen erfasst.

```bibtex
@article{farias2023modularity,
  author       = {Farias, Kleinner and Lazzari, Luan},
  title        = {Event-driven Architecture and {REST} Architectural Style: An Exploratory Study on Modularity},
  journaltitle = {Journal of Applied Research and Technology},
  volume       = {21},
  number       = {3},
  pages        = {338--351},
  date         = {2023},
  doi          = {10.22201/icat.24486736e.2023.21.3.1764},
  langid       = {english}
}
```

### Woodside (2021) — Performance-Modelle ereignisgesteuerter Architekturen

Murray Woodside. „Performance Models of Event-Driven Architectures." In *Companion of the ACM/SPEC International Conference on Performance Engineering (ICPE '21)*, 145–149, 2021. DOI: 10.1145/3447545.3451203.

Inhalt laut Abstract: Ereignisgesteuerte Architekturen verbessern die Skalierbarkeit durch zustandslose Server und asynchrone Interaktion. Der Beitrag zeigt, wie sich ereignisgesteuerte und blockierende, synchrone Komponenten gemeinsam in einem Layered-Queueing-Modell abbilden lassen.

Verwendung: Grundlagen (Skalierbarkeit durch asynchrone Interaktion) und verwandte Arbeiten (modellbasierte gegenüber messbasierter Performance-Bewertung). Passt zur PHP-Seite der Arbeit, in der ein synchrones Ausführungsmodell (PHP-FPM) Ereignisse ausliefert. Hinweis: kurzer Beitrag im Companion-Band, kein Hauptkonferenzbeitrag.

```bibtex
@inproceedings{woodside2021eda,
  author    = {Woodside, Murray},
  title     = {Performance Models of Event-Driven Architectures},
  booktitle = {Companion of the ACM/SPEC International Conference on Performance Engineering (ICPE '21)},
  pages     = {145--149},
  publisher = {ACM},
  date      = {2021},
  doi       = {10.1145/3447545.3451203},
  langid    = {english}
}
```

### Cabane & Farias (2024) — ereignisgesteuerte Architektur und Performance (Ergänzung, nicht im Exposé)

Hebert Cabane, Kleinner Farias. „On the impact of event-driven architecture on performance: An exploratory study." *Future Generation Computer Systems*, 153, 52–69, 2024. DOI: 10.1016/j.future.2023.10.021.

Bei der Prüfung von Farias & Lazzari gefunden. Fundstelle über Crossref bestätigt; das Abstract war über die offenen Schnittstellen nicht abrufbar. Der Inhalt ist daher nur aus dem Titel bekannt und vor jeder Verwendung zu lesen.

Verwendung (vorgesehen): verwandte Arbeiten, empirische Untersuchung der Performance ereignisgesteuerter Architekturen; Abgrenzung zur eigenen Messung (Zustellung an viele dauerhafte Client-Verbindungen statt Kommunikation zwischen Diensten, falls sich das beim Lesen bestätigt).

```bibtex
@article{cabane2024performance,
  author       = {Cabane, Hebert and Farias, Kleinner},
  title        = {On the impact of event-driven architecture on performance: An exploratory study},
  journaltitle = {Future Generation Computer Systems},
  volume       = {153},
  pages        = {52--69},
  date         = {2024},
  doi          = {10.1016/j.future.2023.10.021},
  langid       = {english}
}
```

### Geprüft, nicht übernommen: Tzialla et al. (2024)

Ioanna Tzialla, Jeffery Wang, Jingyi Zhu, Aurojit Panda. „Efficient Auditing of Event-driven Web Applications." In *Proceedings of the 19th European Conference on Computer Systems (EuroSys '24)*, 2024. DOI: 10.1145/3627703.3650089.

Das Exposé zitiert die Arbeit für Herausforderungen beim Überwachen und Auditieren ereignisgesteuerter Systeme. „Auditing" bedeutet dort jedoch die Prüfung, ob ein Server eine Webanwendung unverfälscht ausgeführt hat (Record-Replay für Node.js-Anwendungen auf nicht vertrauenswürdigen Servern). Das ist eine Frage der Integrität, nicht der Beobachtbarkeit im Betrieb, und berührt keine Aussage dieser Arbeit. Für Herausforderungen bei Überwachung und Fehlersuche ist Laigner et al. (2026) die passende Quelle.

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
  date      = {2024},
  doi       = {10.1007/978-3-662-69306-3},
  langid    = {english}
}
```

### Arcuri & Briand (2014) — Statistische Tests in der SE-Forschung

Andrea Arcuri, Lionel Briand. „A Hitchhiker's Guide to Statistical Tests for Assessing Randomized Algorithms in Software Engineering." *Software Testing, Verification and Reliability*, 24(3), 219–250, 2014. DOI: 10.1002/stvr.1486.

Verwendung: Signifikanztests stets zusammen mit einer Effektstärke berichten; statistische Signifikanz allein belegt keine praktische Relevanz (DECISIONS.md 5.8).

```bibtex
@article{arcuri2014hitchhiker,
  author       = {Arcuri, Andrea and Briand, Lionel},
  title        = {A Hitchhiker's Guide to Statistical Tests for Assessing
             Randomized Algorithms in Software Engineering},
  journaltitle = {Software Testing, Verification and Reliability},
  volume       = {24},
  number       = {3},
  pages        = {219--250},
  date         = {2014},
  doi          = {10.1002/stvr.1486},
  langid       = {english}
}
```

## Signifikanztest

### Wilcoxon (1945) — Vorzeichen-Rang-Test

Frank Wilcoxon. „Individual Comparisons by Ranking Methods." *Biometrics Bulletin*, 1(6), 80–83, 1945.

Verwendung: gepaarter Signifikanztest (DECISIONS.md 5.8) auf den Laufpaaren des alternierenden Designs; verteilungsfrei, ohne Normalverteilungsannahme. Implementierung: `tools/orchestrate/stats.js` (`wilcoxonSignedRank`), exakte Nullverteilung bis 50 Paare ohne Bindungen, sonst Normalapproximation mit Stetigkeits- und Bindungskorrektur. Nicht zu verwechseln mit dem ungepaarten Rangsummentest aus derselben Arbeit.

```bibtex
@article{wilcoxon1945individual,
  author       = {Wilcoxon, Frank},
  title        = {Individual Comparisons by Ranking Methods},
  journaltitle = {Biometrics Bulletin},
  volume       = {1},
  number       = {6},
  pages        = {80--83},
  date         = {1945},
  doi          = {10.2307/3001968},
  langid       = {english}
}
```

### Mann & Whitney (1947) — ungepaarter U-Test (ersetzt)

Henry B. Mann, Donald R. Whitney. „On a Test of Whether one of Two Random Variables is Stochastically Larger than the Other." *The Annals of Mathematical Statistics*, 18(1), 50–60, 1947. DOI: 10.1214/aoms/1177730491.

Status: bis 2026-10-16 vorgesehenes Verfahren, ersetzt durch den gepaarten Wilcoxon-Test, der die Paarstruktur des alternierenden Designs nutzt. Dokumentiert, damit die Revision der Entscheidung nachvollziehbar bleibt.

```bibtex
@article{mann1947test,
  author       = {Mann, H. B. and Whitney, D. R.},
  title        = {On a Test of Whether one of Two Random Variables is
             Stochastically Larger than the Other},
  journaltitle = {The Annals of Mathematical Statistics},
  volume       = {18},
  number       = {1},
  pages        = {50--60},
  date         = {1947},
  doi          = {10.1214/aoms/1177730491},
  langid       = {english}
}
```

### Armitage, McPherson & Rowe (1969) — wiederholtes Testen auf anwachsenden Daten

P. Armitage, C. K. McPherson, B. C. Rowe. „Repeated Significance Tests on Accumulating Data." *Journal of the Royal Statistical Society, Series A (General)*, 132(2), 235–244, 1969. DOI: 10.2307/2343787 (über Crossref bestätigt am 2026-10-17).

Verwendung: Begründung, warum Zwischenauswertungen in den Hauptkampagnen kein Abbruchkriterium sind und die Wiederholungszahl vorab aus einem Pilot festgelegt wird (DECISIONS.md 5.9). Wird auf anwachsenden Daten wiederholt getestet und bei Signifikanz abgebrochen, steigt die Fehlerrate erster Art deutlich über das nominelle Niveau.

```bibtex
@article{armitage1969repeated,
  author       = {Armitage, P. and McPherson, C. K. and Rowe, B. C.},
  title        = {Repeated Significance Tests on Accumulating Data},
  journaltitle = {Journal of the Royal Statistical Society. Series A (General)},
  volume       = {132},
  number       = {2},
  pages        = {235--244},
  date         = {1969},
  doi          = {10.2307/2343787},
  langid       = {english}
}
```

### Kerr (1998) — Hypothesen vor den Ergebnissen festlegen

Norbert L. Kerr. „HARKing: Hypothesizing After the Results are Known." *Personality and Social Psychology Review*, 2(3), 196–217, 1998. DOI: 10.1207/s15327957pspr0203_4.

Verwendung: Begründung, die Hypothesen H1–H11 vor der Datenerhebung festzulegen (DECISIONS.md 5.18). HARKing bezeichnet das Darstellen einer nachträglich aus den Ergebnissen abgeleiteten Hypothese, als sei sie vorab formuliert gewesen.

```bibtex
@article{kerr1998harking,
  author       = {Kerr, Norbert L.},
  title        = {{HARKing}: Hypothesizing After the Results are Known},
  journaltitle = {Personality and Social Psychology Review},
  volume       = {2},
  number       = {3},
  pages        = {196--217},
  date         = {1998},
  doi          = {10.1207/s15327957pspr0203_4},
  langid       = {english}
}
```

## Effektstärke

### Cliff (1993) — Cliff's Delta

Norman Cliff. „Dominance Statistics: Ordinal Analyses to Answer Ordinal Questions." *Psychological Bulletin*, 114(3), 494–509, 1993.

Verwendung: eingeordnetes Effektmaß (DECISIONS.md 5.8). Ordinal, ohne Intervallskalen-Annahme wie bei Cohen's d, und damit für Latenzdaten geeigneter als parametrische Effektmaße.

```bibtex
@article{cliff1993dominance,
  author       = {Cliff, Norman},
  title        = {Dominance Statistics: Ordinal Analyses to Answer Ordinal
             Questions},
  journaltitle = {Psychological Bulletin},
  volume       = {114},
  number       = {3},
  pages        = {494--509},
  date         = {1993},
  doi          = {10.1037/0033-2909.114.3.494},
  langid       = {english}
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
  date      = {2006},
  langid    = {english}
}
```

### Kerby (2014) — rangbiseriale Korrelation für gepaarte Daten

Dave S. Kerby. „The Simple Difference Formula: An Approach to Teaching Nonparametric Correlation." *Comprehensive Psychology*, 3, 2014. DOI: 10.2466/11.IT.3.1 (über Crossref bestätigt am 2026-10-17).

Verwendung: zusätzlich zu Cliff's Delta ausgegebenes Effektmaß r = (W⁺ − W⁻) / (W⁺ + W⁻), das direkt zum Wilcoxon-Vorzeichen-Rang-Test passt: Anteil der Rangsumme, der für eine Richtung spricht, minus Anteil, der dagegen spricht (DECISIONS.md 5.8).

```bibtex
@article{kerby2014simple,
  author       = {Kerby, Dave S.},
  title        = {The Simple Difference Formula: An Approach to Teaching
             Nonparametric Correlation},
  journaltitle = {Comprehensive Psychology},
  volume       = {3},
  date         = {2014},
  doi          = {10.2466/11.IT.3.1},
  langid       = {english}
}
```

### Vargha & Delaney (2000) — verwandtes Maß, zur Abgrenzung

András Vargha, Harold D. Delaney. „A Critique and Improvement of the CL Common Language Effect Size Statistics of McGraw and Wong." *Journal of Educational and Behavioral Statistics*, 25(2), 101–132, 2000. DOI: 10.3102/10769986025002101.

Verwendung: Abgrenzung, nicht Quelle der verwendeten Schwellen. Das Maß A₁₂ ist mathematisch äquivalent zu Cliff's Delta (δ = 2·A₁₂ − 1), Vargha & Delaney verwenden jedoch eigene, leicht abweichende Schwellen.

```bibtex
@article{vargha2000critique,
  author       = {Vargha, Andr{\'a}s and Delaney, Harold D.},
  title        = {A Critique and Improvement of the {CL} Common Language
             Effect Size Statistics of {M}c{G}raw and Wong},
  journaltitle = {Journal of Educational and Behavioral Statistics},
  volume       = {25},
  number       = {2},
  pages        = {101--132},
  date         = {2000},
  doi          = {10.3102/10769986025002101},
  langid       = {english}
}
```

## Mehrfachvergleiche

### Holm (1979) — Holm-Bonferroni-Korrektur

Sture Holm. „A Simple Sequentially Rejective Multiple Test Procedure." *Scandinavian Journal of Statistics*, 6(2), 65–70, 1979.

Verwendung: Korrektur je Testfamilie über 39 geplante Tests (13 Vergleiche × 3 Laststufen; DECISIONS.md 5.8, 5.15). Kontrolliert die familienweise Fehlerrate bei beliebiger Abhängigkeit der Tests und ist trennschärfer als die Bonferroni-Korrektur. Implementierung: `holmCorrection` in `tools/orchestrate/stats.js`.

```bibtex
@article{holm1979simple,
  author       = {Holm, Sture},
  title        = {A Simple Sequentially Rejective Multiple Test Procedure},
  journaltitle = {Scandinavian Journal of Statistics},
  volume       = {6},
  number       = {2},
  pages        = {65--70},
  date         = {1979},
  langid       = {english}
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
  date      = {1993},
  langid    = {english}
}
```

## Messauflösung

### Widrow & Kollár (2008) — Quantisierungsrauschen

Bernard Widrow, István Kollár. *Quantization Noise: Roundoff Error in Digital Computation, Signal Processing, Control, and Communications*. Cambridge University Press, 2008. ISBN 978-0-521-88671-0. DOI: 10.1017/CBO9780511754661 (über Crossref bestätigt am 2026-10-17).

Verwendung: Begründung des Mittelwerts pro Lauf als Testgröße (DECISIONS.md 5.8). Werden Zeitstempel auf ganze Millisekunden gerundet und sind die Ereignisse nicht an das Millisekundenraster gekoppelt, ist der Rundungsfehler näherungsweise gleichverteilt und im Mittel null. Der Mittelwert vieler gerundeter Werte ist dann fein aufgelöst und unverzerrt, der Median dagegen bleibt an das Raster gebunden.

```bibtex
@book{widrow2008quantization,
  author    = {Widrow, Bernard and Koll{\'a}r, Istv{\'a}n},
  title     = {Quantization Noise: Roundoff Error in Digital Computation,
               Signal Processing, Control, and Communications},
  publisher = {Cambridge University Press},
  date      = {2008},
  doi       = {10.1017/CBO9780511754661},
  langid    = {english}
}
```

## Pseudoreplikation und Analyseeinheit

### Hurlbert (1984) — Pseudoreplikation

Stuart H. Hurlbert. „Pseudoreplication and the Design of Ecological Field Experiments." *Ecological Monographs*, 54(2), 187–211, 1984.

Verwendung: Begründung, den k6-Lauf statt des Einzelereignisses als Analyseeinheit zu verwenden (DECISIONS.md 5.8). Die Grundaussage, dass abhängige Beobachtungen (hier: Events desselben Laufs mit gemeinsamem Prozesszustand und gemeinsamer Host-Auslastung) nicht als unabhängige Stichprobe in einen Test eingehen dürfen, ist disziplinübergreifend anerkannt. Die Übertragung aus der Ökologie auf Softwaremessungen sollte in der Arbeit kurz eingeordnet werden.

```bibtex
@article{hurlbert1984pseudoreplication,
  author       = {Hurlbert, Stuart H.},
  title        = {Pseudoreplication and the Design of Ecological Field
             Experiments},
  journaltitle = {Ecological Monographs},
  volume       = {54},
  number       = {2},
  pages        = {187--211},
  date         = {1984},
  doi          = {10.2307/1942661},
  langid       = {english}
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
  date      = {2007},
  doi       = {10.1145/1297027.1297033},
  langid    = {english}
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
  date      = {2013},
  doi       = {10.1145/2464157.2464160},
  langid    = {english}
}
```

## Latenz aus Nutzersicht

### Dean & Barroso (2013) — Tail-Latenz

Jeffrey Dean, Luiz André Barroso. „The Tail at Scale." *Communications of the ACM*, 56(2), 74–80, 2013. DOI: 10.1145/2408776.2408794.

Verwendung: Begründung, p95, p99 und Maximum zusätzlich zum Mittelwert pro Lauf zu berichten (DECISIONS.md 5.8). Tail-Latenzen sind bei vielen gleichzeitigen Verbindungen für Nutzer oft wichtiger als der Durchschnitt.

```bibtex
@article{dean2013tail,
  author       = {Dean, Jeffrey and Barroso, Luiz Andr{\'e}},
  title        = {The Tail at Scale},
  journaltitle = {Communications of the ACM},
  volume       = {56},
  number       = {2},
  pages        = {74--80},
  date         = {2013},
  doi          = {10.1145/2408776.2408794},
  langid       = {english}
}
```

### Nielsen (1993) — Grenzen der Antwortzeit

Jakob Nielsen. *Usability Engineering*. Academic Press, Boston, 1993. Kapitel 5 (Antwortzeiten). ISBN 0-12-518405-0 (Verlag, Ort und ISBN über Open Library bestätigt am 2026-10-17). Die drei Grenzen (0,1 s, 1 s, 10 s) sind vom Autor auch online zusammengefasst: nngroup.com/articles/response-times-3-important-limits.

Verwendung: Latenzgrenze von 1 000 ms im Sättigungskriterium (DECISIONS.md 5.17). Bis etwa eine Sekunde unterbricht eine Verzögerung den Gedankenfluss von Nutzern nicht.

```bibtex
@book{nielsen1993usability,
  author    = {Nielsen, Jakob},
  title     = {Usability Engineering},
  publisher = {Academic Press},
  location  = {Boston},
  date      = {1993},
  langid    = {english}
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
  date      = {2015},
  doi       = {10.1109/ISPASS.2015.7095802},
  langid    = {english}
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
  date        = {2011},
  doi         = {10.17487/RFC6455},
  langid      = {english}
}
```

### WHATWG HTML Living Standard — Server-Sent Events

WHATWG. „9.2 Server-Sent Events." *HTML Living Standard*. https://html.spec.whatwg.org/multipage/server-sent-events.html (fortlaufend aktualisiert; Abrufdatum angeben).

Verwendung: formale Definition von SSE. Anders als WebSocket ist SSE kein IETF-RFC, sondern Teil des WHATWG-Standards; dieser Unterschied im Publikationsstatus kann in der Arbeit kurz erwähnt werden.

```bibtex
@online{whatwg-sse,
  author  = {{WHATWG}},
  title   = {{HTML} Living Standard: 9.2 Server-Sent Events},
  url     = {https://html.spec.whatwg.org/multipage/server-sent-events.html},
  urldate = {2026-08-25},
  langid  = {english}
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
  date        = {2010},
  doi         = {10.17487/RFC5905},
  langid      = {english}
}
```

### RFC 6202 — Long Polling und Streaming über HTTP

S. Loreto, P. Saint-Andre, S. Salsano, G. Wilkins. „Known Issues and Best Practices for the Use of Long Polling and Streaming in Bidirectional HTTP." RFC 6202, IETF, April 2011. DOI: 10.17487/RFC6202.

Verwendung: Definition und Grenzen von Long Polling und HTTP-Streaming im Grundlagenkapitel (Push-Verfahren vor SSE und WebSocket).

```bibtex
@techreport{loreto2011longpolling,
  author      = {Loreto, S. and Saint-Andre, P. and Salsano, S. and Wilkins, G.},
  title       = {Known Issues and Best Practices for the Use of Long Polling and Streaming in Bidirectional {HTTP}},
  institution = {IETF},
  number      = {RFC 6202},
  date        = {2011-04},
  doi         = {10.17487/RFC6202},
  langid      = {english}
}
```

### RFC 9110 und RFC 9112 — HTTP-Semantik und HTTP/1.1

R. Fielding, M. Nottingham, J. Reschke (Hrsg.). „HTTP Semantics." RFC 9110, IETF, Juni 2022. DOI: 10.17487/RFC9110. Dieselben. „HTTP/1.1." RFC 9112, IETF, Juni 2022. DOI: 10.17487/RFC9112.

Verwendung: HTTP-Grundlagen, auf denen SSE aufbaut; persistente Verbindungen und die Empfehlung an Clients, die Zahl gleichzeitiger Verbindungen zu einem Server zu begrenzen (RFC 9112, Abschnitt 9).

```bibtex
@techreport{fielding2022semantics,
  author      = {Fielding, R. and Nottingham, M. and Reschke, J.},
  title       = {{HTTP} Semantics},
  institution = {IETF},
  number      = {RFC 9110},
  date        = {2022-06},
  doi         = {10.17487/RFC9110},
  langid      = {english}
}

@techreport{fielding2022http11,
  author      = {Fielding, R. and Nottingham, M. and Reschke, J.},
  title       = {{HTTP/1.1}},
  institution = {IETF},
  number      = {RFC 9112},
  date        = {2022-06},
  doi         = {10.17487/RFC9112},
  langid      = {english}
}
```

### RFC 9113 — HTTP/2

M. Thomson, C. Benfield (Hrsg.). „HTTP/2." RFC 9113, IETF, Juni 2022. DOI: 10.17487/RFC9113.

Verwendung: Multiplexing mehrerer Streams über eine Verbindung als Unterschied zu HTTP/1.1 (DECISIONS.md 5.2, 5.12; Grundlagenkapitel).

```bibtex
@techreport{thomson2022http2,
  author      = {Thomson, M. and Benfield, C.},
  title       = {{HTTP/2}},
  institution = {IETF},
  number      = {RFC 9113},
  date        = {2022-06},
  doi         = {10.17487/RFC9113},
  langid      = {english}
}
```

### MDN Web Docs — EventSource

Mozilla. „EventSource." *MDN Web Docs*. https://developer.mozilla.org/en-US/docs/Web/API/EventSource

Verwendung: Beleg für die Grenze von sechs gleichzeitigen SSE-Verbindungen je Browser und Domain ohne HTTP/2 (Grundlagenkapitel, DECISIONS.md 5.2). Die Grenze ist eine Eigenschaft der Browser, nicht der SSE-Spezifikation.

```bibtex
@online{mdn-eventsource,
  author  = {{Mozilla}},
  title   = {{EventSource}},
  url     = {https://developer.mozilla.org/en-US/docs/Web/API/EventSource},
  urldate = {2026-10-16},
  langid  = {english}
}
```

## Dokumentation der eingesetzten Technologien

Offizielle Dokumentation als Beleg für Funktionsweise und Konfiguration der eingesetzten Komponenten (Grundlagen, Umsetzung, Methodik). Alle Adressen wurden am 2026-10-16 abgerufen. Online-Dokumentation ändert sich; die zitierte Fassung ist durch das Abrufdatum bestimmt.

### Nginx — Proxy-, FastCGI- und Verbindungsverarbeitung

nginx.org. „Module ngx_http_proxy_module", „Module ngx_http_fastcgi_module" und „Connection processing methods". https://nginx.org/en/docs/

Verwendung: ereignisgesteuerte Verbindungsverarbeitung von Nginx (Grundlagen, DECISIONS.md 5.1); Pufferung von Antworten (`proxy_buffering`, `fastcgi_buffering`, Header `X-Accel-Buffering`), die für SSE abgeschaltet sein muss (DECISIONS.md 5.6.1).

```bibtex
@online{nginx-proxy,
  author  = {{nginx.org}},
  title   = {Module ngx\_http\_proxy\_module},
  url     = {https://nginx.org/en/docs/http/ngx_http_proxy_module.html},
  urldate = {2026-10-16},
  langid  = {english}
}

@online{nginx-fastcgi,
  author  = {{nginx.org}},
  title   = {Module ngx\_http\_fastcgi\_module},
  url     = {https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html},
  urldate = {2026-10-16},
  langid  = {english}
}

@online{nginx-events,
  author  = {{nginx.org}},
  title   = {Connection Processing Methods},
  url     = {https://nginx.org/en/docs/events.html},
  urldate = {2026-10-16},
  langid  = {english}
}
```

### Apache HTTP Server — Multi-Processing-Module

The Apache Software Foundation. „Multi-Processing Modules (MPMs)" und „Apache MPM event". *Apache HTTP Server Version 2.4 Documentation*.

Verwendung: Prozess- und Thread-Modelle von Apache (prefork, worker, event) im Grundlagenkapitel und als Begründung für Nginx (DECISIONS.md 5.1, 5.11).

```bibtex
@online{apache-mpm,
  author  = {{The Apache Software Foundation}},
  title   = {Multi-Processing Modules ({MPMs})},
  url     = {https://httpd.apache.org/docs/2.4/mpm.html},
  urldate = {2026-10-16},
  langid  = {english}
}

@online{apache-event,
  author  = {{The Apache Software Foundation}},
  title   = {Apache {MPM} event},
  url     = {https://httpd.apache.org/docs/2.4/mod/event.html},
  urldate = {2026-10-16},
  langid  = {english}
}
```

### Redis — Pub/Sub

Redis Ltd. „Redis Pub/Sub." *Redis Documentation*. https://redis.io/docs/latest/develop/pubsub/

Verwendung: Funktionsweise von Redis Pub/Sub und dessen Zustellsemantik (höchstens einmal, keine Speicherung für abwesende Abonnenten), DECISIONS.md 5.4, 5.17.

```bibtex
@online{redis-pubsub,
  author  = {{Redis Ltd.}},
  title   = {Redis {Pub/Sub}},
  url     = {https://redis.io/docs/latest/develop/pubsub/},
  urldate = {2026-10-16},
  langid  = {english}
}
```

### MQTT 5.0

A. Banks, E. Briggs, K. Borgendale, R. Gupta (Hrsg.). „MQTT Version 5.0." OASIS Standard, 7. März 2019. https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html

Verwendung: MQTT als Geräteeingang von Lokato im Grundlagen- und Entwurfskapitel; Dienstgüten (QoS 0 bis 2) im Vergleich mit der Zustellsemantik von Redis Pub/Sub; MQTT als alternativer Verteilweg in der Diskussion (DECISIONS.md 5.4).

```bibtex
@online{oasis2019mqtt,
  editor       = {Banks, Andrew and Briggs, Ed and Borgendale, Ken and Gupta, Rahul},
  title        = {{MQTT} Version 5.0},
  organization = {{OASIS}},
  date         = {2019-03-07},
  url          = {https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html},
  urldate      = {2026-10-18},
  langid       = {english}
}
```

### BullMQ

Taskforce.sh. *BullMQ Documentation*. https://docs.bullmq.io/

Verwendung: Queue der Node.js-Zelle mit Queue (Jobs, Worker, Speicherung in Redis), DECISIONS.md 5.19.

```bibtex
@online{bullmq-docs,
  author  = {{Taskforce.sh}},
  title   = {{BullMQ} Documentation},
  url     = {https://docs.bullmq.io/},
  urldate = {2026-10-16},
  langid  = {english}
}
```

### Laravel — Queues, Broadcasting, Reverb, Deployment, Releases

Laravel. *Laravel 13.x Documentation*, Kapitel „Queues", „Broadcasting", „Laravel Reverb", „Deployment" und „Release Notes". https://laravel.com/docs/13.x

Verwendung: Queue-Worker und `block_for` (DECISIONS.md 5.19, 5.20), Broadcasting über Reverb (WebSocket-Zelle), Produktionskonfiguration mit Config-, Route- und Event-Cache (DECISIONS.md 5.5), Unterstützungszeiträume der Laravel-Versionen als Begründung für Laravel 13 (DECISIONS.md 5.23).

```bibtex
@online{laravel-queues,
  author  = {{Laravel}},
  title   = {Queues: Laravel 13.x Documentation},
  url     = {https://laravel.com/docs/13.x/queues},
  urldate = {2026-10-16},
  langid  = {english}
}

@online{laravel-broadcasting,
  author  = {{Laravel}},
  title   = {Broadcasting: Laravel 13.x Documentation},
  url     = {https://laravel.com/docs/13.x/broadcasting},
  urldate = {2026-10-16},
  langid  = {english}
}

@online{laravel-reverb,
  author  = {{Laravel}},
  title   = {Laravel Reverb: Laravel 13.x Documentation},
  url     = {https://laravel.com/docs/13.x/reverb},
  urldate = {2026-10-16},
  langid  = {english}
}

@online{laravel-deployment,
  author  = {{Laravel}},
  title   = {Deployment: Laravel 13.x Documentation},
  url     = {https://laravel.com/docs/13.x/deployment},
  urldate = {2026-10-16},
  langid  = {english}
}

@online{laravel-releases,
  author  = {{Laravel}},
  title   = {Release Notes: Laravel 13.x Documentation},
  url     = {https://laravel.com/docs/13.x/releases},
  urldate = {2026-10-16},
  langid  = {english}
}
```

### PHP-FPM und offizielles PHP-Image

The PHP Group. „FastCGI Process Manager (FPM)" und „Configuration". *PHP Manual*. Docker Official Images. „php" (Image-Dokumentation).

Verwendung: Prozessmodell von PHP-FPM, Pool-Konfiguration (`pm`, `pm.max_children`, `ping.path`), DECISIONS.md 5.5; Empfehlung des offiziellen Images, in Produktion `php.ini-production` zu verwenden (DECISIONS.md 5.5).

```bibtex
@online{php-fpm,
  author  = {{The PHP Group}},
  title   = {{FastCGI} Process Manager ({FPM})},
  url     = {https://www.php.net/manual/en/install.fpm.php},
  urldate = {2026-10-16},
  langid  = {english}
}

@online{php-fpm-config,
  author  = {{The PHP Group}},
  title   = {{FPM} Configuration},
  url     = {https://www.php.net/manual/en/install.fpm.configuration.php},
  urldate = {2026-10-16},
  langid  = {english}
}

@online{docker-php-image,
  author  = {{Docker Official Images}},
  title   = {php: Docker Official Image Documentation},
  url     = {https://github.com/docker-library/docs/blob/master/php/README.md},
  urldate = {2026-10-16},
  langid  = {english}
}
```

### Symfony und Mercure

Symfony SAS. „Pushing Data to Clients Using the Mercure Protocol." *Symfony Documentation*. https://symfony.com/doc/current/mercure.html — Mercure-Projekt. „Install the Mercure Hub." https://mercure.rocks/docs/hub/install

Verwendung: Begründung, warum keine Symfony-Variante gemessen wird (DECISIONS.md 5.23). Symfony überträgt Push-Nachrichten über Mercure; die dauerhaften SSE-Verbindungen hält dabei ein eigener Hub-Server, der als Go-Programm bzw. Caddy-Modul ausgeliefert wird. Eine Symfony-Variante würde den Push-Pfad daher nicht in PHP messen.

Ergänzend aus dem Exposé: Symfony. „Events and Event Listeners." *Symfony Documentation*. https://symfony.com/doc/current/event_dispatcher.html (die im Exposé genannte Adresse der Komponentendokumentation leitet dorthin weiter). Die Dokumentation beschreibt den EventDispatcher als Umsetzung der Muster Mediator und Observer, mit denen Komponenten einer Anwendung über Ereignisse kommunizieren. Beleg dafür, dass der EventDispatcher ein Mechanismus innerhalb eines Prozesses ist und keinen Weg zum Client bietet (DECISIONS.md 5.23).

```bibtex
@online{symfony-eventdispatcher,
  author  = {{Symfony SAS}},
  title   = {Events and Event Listeners},
  url     = {https://symfony.com/doc/current/event_dispatcher.html},
  urldate = {2026-10-17},
  langid  = {english}
}

@online{symfony-mercure,
  author  = {{Symfony SAS}},
  title   = {Pushing Data to Clients Using the Mercure Protocol},
  url     = {https://symfony.com/doc/current/mercure.html},
  urldate = {2026-10-16},
  langid  = {english}
}

@online{mercure-hub,
  author  = {{Mercure}},
  title   = {Install the Mercure Hub},
  url     = {https://mercure.rocks/docs/hub/install},
  urldate = {2026-10-16},
  langid  = {english}
}
```

### Ratchet und ReactPHP

Chris Boden u. a. *Ratchet Documentation*. http://socketo.me/docs/ — ReactPHP-Projekt. *ReactPHP*. https://reactphp.org/

Verwendung: ereignisgesteuerter WebSocket-Server der PHP-Minimalvariante auf Basis der ReactPHP-Ereignisschleife (Grundlagen, Umsetzung).

```bibtex
@online{ratchet-docs,
  author  = {{Ratchet}},
  title   = {Ratchet Documentation},
  url     = {http://socketo.me/docs/},
  urldate = {2026-10-16},
  langid  = {english}
}

@online{reactphp,
  author  = {{ReactPHP}},
  title   = {{ReactPHP}: Event-Driven, Non-Blocking {I/O} with {PHP}},
  url     = {https://reactphp.org/},
  urldate = {2026-10-16},
  langid  = {english}
}
```

### Node.js, Express und ws

Node.js Project. „The Node.js Event Loop." *Node.js Learn*. — Express. „Production Best Practices: Performance and Reliability." — ws. *ws: a Node.js WebSocket library* (README).

Verwendung: Ereignisschleife von Node.js (Grundlagen); Produktionsbetrieb von Express mit `NODE_ENV=production` (DECISIONS.md 5.5); WebSocket-Bibliothek der Node.js-Zellen.

```bibtex
@online{nodejs-event-loop,
  author  = {{Node.js Project}},
  title   = {The {Node.js} Event Loop},
  url     = {https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick},
  urldate = {2026-10-16},
  langid  = {english}
}

@online{express-production,
  author  = {{Express}},
  title   = {Production Best Practices: Performance and Reliability},
  url     = {https://expressjs.com/en/advanced/best-practice-performance.html},
  urldate = {2026-10-16},
  langid  = {english}
}

@online{ws-library,
  author  = {{ws}},
  title   = {ws: A {Node.js} {WebSocket} Library},
  url     = {https://github.com/websockets/ws},
  urldate = {2026-10-16},
  langid  = {english}
}
```

### k6 und xk6-sse

Grafana Labs. *Grafana k6 Documentation*. https://grafana.com/docs/k6/latest/ — Pierrick Hymbert. *xk6-sse: A k6 extension for Server-Sent Events*. https://github.com/phymbert/xk6-sse

Verwendung: Lastwerkzeug, virtuelle Benutzer, Metriken und Zusammenfassungsexport (Methodik); SSE-Client der Messung (DECISIONS.md 3).

```bibtex
@online{k6-docs,
  author  = {{Grafana Labs}},
  title   = {Grafana k6 Documentation},
  url     = {https://grafana.com/docs/k6/latest/},
  urldate = {2026-10-16},
  langid  = {english}
}

@online{xk6-sse,
  author  = {Hymbert, Pierrick},
  title   = {xk6-sse: A k6 Extension for {Server-Sent} Events},
  url     = {https://github.com/phymbert/xk6-sse},
  urldate = {2026-10-16},
  langid  = {english}
}
```

### Linux cgroup v2 und docker stats

The Linux Kernel Documentation. „Control Group v2." https://docs.kernel.org/admin-guide/cgroup-v2.html — Docker Inc. „docker container stats." *Docker Docs*. https://docs.docker.com/reference/cli/docker/container/stats/

Verwendung: Ressourcenmessung aus `cpu.stat`, `memory.current` und `memory.stat` (DECISIONS.md 5.16, `tools/resource-sampler`); Definition des Working Sets wie bei `docker stats` (Speicher abzüglich `inactive_file`).

```bibtex
@online{kernel-cgroup-v2,
  author  = {{The Linux Kernel Documentation}},
  title   = {Control Group v2},
  url     = {https://docs.kernel.org/admin-guide/cgroup-v2.html},
  urldate = {2026-10-16},
  langid  = {english}
}

@online{docker-stats,
  author  = {{Docker Inc.}},
  title   = {docker container stats},
  url     = {https://docs.docker.com/reference/cli/docker/container/stats/},
  urldate = {2026-10-16},
  langid  = {english}
}
```

## Technische Referenzdokumentation (Debugging- und Monitoring-Vergleich)

Offizielle Werkzeugdokumentation als Beleg für den Vergleich in DECISIONS.md 5.13.

### Node.js — Debugger und Inspector

Node.js-Projekt. „Debugger" und „Inspector", *Node.js API-Dokumentation*. https://nodejs.org/api/debugger.html

Verwendung: Der Schritt-Debugger (`--inspect`, V8 Inspector / Chrome-DevTools-Protokoll) ist Bestandteil des Node.js-Kerns.

```bibtex
@online{nodejs-debugger,
  author  = {{Node.js Project}},
  title   = {Debugger: {N}ode.js {API} Documentation},
  url     = {https://nodejs.org/api/debugger.html},
  urldate = {2026-08-25},
  langid  = {english}
}
```

### Xdebug — Installation

Derick Rethans. *Xdebug Documentation — Installation*. https://xdebug.org/docs/install

Verwendung: Xdebug ist eine separate PECL-Erweiterung und wird nicht mit PHP ausgeliefert.

```bibtex
@online{xdebug-install,
  author  = {Rethans, Derick},
  title   = {Xdebug Documentation: Installation},
  url     = {https://xdebug.org/docs/install},
  urldate = {2026-08-25},
  langid  = {english}
}
```

---

## Übersicht: Quelle je Entscheidung

| DECISIONS.md | Entscheidung | Quelle(n) |
| ------------ | ------------ | --------- |
| Verwandte Arbeiten | Nebenläufigkeitsmodelle von Servern | Lauer & Needham (1979); Welsh et al. (2001); von Behren et al. (2003); Pariag et al. (2007) |
| Verwandte Arbeiten | PHP und Node.js | Tilkov & Vinoski (2010); Lei, Ma & Tan (2014) |
| Verwandte Arbeiten | Echtzeit im Web, Messaging | Murley et al. (2021); Hohpe & Woolf (2003) |
| 5.18 | Hypothesen vorab festlegen | Kerr (1998) |
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
| Grundlagen | Polling, Long Polling, Streaming | RFC 6202 |
| 5.2, 5.12 | HTTP/1.1, HTTP/2, Verbindungsgrenze im Browser | RFC 9110; RFC 9112; RFC 9113; MDN EventSource |
| 5.1, 5.11 | Nginx ereignisgesteuert, Apache-MPMs | Nginx-Dokumentation; Apache-Dokumentation |
| 5.6.1 | Pufferung im Front-Nginx für SSE abgeschaltet | Nginx-Dokumentation (Proxy, FastCGI) |
| 5.4, 5.17 | Zustellsemantik von Redis Pub/Sub | Redis-Dokumentation |
| 5.4 | MQTT als Geräteeingang von Lokato, Dienstgüten, MQTT als alternativer Verteilweg | OASIS MQTT 5.0 |
| 5.4 | Push über einen Broker statt Polling | Fowler (2017); Hohpe & Woolf (2003); RFC 6202 |
| 5.5 | Produktionsbetrieb (php.ini, Laravel-Caches, `NODE_ENV`) | PHP-Image-Dokumentation; Laravel Deployment; Express Production Best Practices |
| 5.5 | PHP-FPM-Prozessmodell und Pool-Konfiguration | PHP-Handbuch (FPM) |
| 5.19, 5.20 | Queues (BullMQ, Laravel Queue, `block_for`) | BullMQ-Dokumentation; Laravel Queues |
| 5.16 | Ressourcenmessung über cgroup v2, Working Set | Kernel-Dokumentation cgroup v2; Docker-Dokumentation `docker stats` |
| 3, 5.9 | Lastwerkzeug k6 und xk6-sse | k6-Dokumentation; xk6-sse |
| 5.23 | Laravel 13 statt 12 (Unterstützungszeitraum) | Laravel Release Notes |
| 5.23 | keine Symfony-Variante | Symfony EventDispatcher und Mercure; Mercure-Hub |
| Grundlagen | Anfrage-Antwort-Modell, ereignisbasierte Integration | Fielding (2000); Fowler (2017); Hohpe & Woolf (2003) |
| Verwandte Arbeiten | ereignisgesteuerte Architektur: Modularität, Performance, Herausforderungen, Modelle | Farias & Lazzari (2023); Cabane & Farias (2024); Laigner et al. (2026); Woodside (2021) |
| 5.13, 5.22 | Fehlersuche und Überwachung, Wartbarkeit | Laigner et al. (2026); Farias & Lazzari (2023) |
