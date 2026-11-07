# Literature

Sources for the related work and for the decisions in `DECISIONS.md`, ordered by topic. Each source has its full reference, its purpose and a BibTeX entry. The details were cross-checked by web search (as of 2026-08-25, additions on 2026-10-16, 2026-10-17, 2026-10-18, 2026-11-03 and 2026-11-04). The BibTeX entries follow the recommendations of the HagenbergThesis template for biblatex (`date`, `journaltitle`, `urldate`, `langid`, online sources as `@online`, no ISBN) and can be copied unchanged into the `.bib` file of the thesis. On 2026-10-17, all records with a DOI were confirmed through Crossref, books without a DOI through Open Library or the publisher. On 2026-11-03, all entries with a DOI were compared with Crossref again, the RFCs with the RFC Editor, and all addresses were accessed. Open points are marked with **CHECK BY HAND.**, and the list is directly below. Online sources carry their access date. Summaries of content are based on abstracts and catalog records. The thesis cites only what the author has read.

**Adding sources.** A source is added only after its existence and metadata (authors, title, year, venue, volume, pages, DOI) are confirmed through Crossref, arXiv, Open Library, rfc-editor.org or the publisher's page. The entry names the claim the source supports in the thesis. Whether the source actually contains that claim is checked in the original before citing it. Unconfirmed details are not adopted. New sources go into this file and into `references.bib`.

## To check by hand (as of 2026-11-04)

The author checks these points in the original before they appear in the text. Each source concerned carries the note **CHECK BY HAND.**

**Important, the thesis relies on these:**

- [ ] **Research gap.** The search in IEEE Xplore, ACM Digital Library and Google Scholar is still open. Read and place Van de Vyvere et al. (2020) and Appelqvist & Örnmyr (2017). Both are close to the gap.
- [ ] **Romano et al. (2006).** Check the four thresholds of Cliff's delta in the original. The full text was not available during this review. The earlier claim that the thresholds became established through Arcuri & Briand (2014) was wrong and has been removed.
- [ ] **Arcuri & Briand (2014).** The paper recommends the effect measure A12 by Vargha & Delaney and mentions neither Cliff's delta nor Romano. It supports only the statement that almost any difference becomes significant with enough runs, and the use of paired tests. Be prepared for the question "why not A12?" (δ = 2·A12 − 1).
- [ ] **Kalibera & Jones (2013).** Only searched for key terms on 2026-11-04. The paper does not say that measurement data are typically non-normal, so DECISIONS.md 5.8 no longer cites it for that. Confirm its use for setting the number of repetitions from an initial experiment (DECISIONS.md 5.9).
- [ ] **Hoefler & Belli (2015).** Now the source for not assuming a normal distribution (DECISIONS.md 5.8). Read rule 6 and the passage on nonparametric techniques in the original.
- [ ] **Felter et al. (2015).** The source compares KVM and Docker, not PHP and Node.js. That the overhead affects both alike is a conclusion of this thesis and must be worded that way in the text.
- [ ] **RFC 5905.** The statement on the accuracy of NTP was too coarse and has been corrected (also in DECISIONS.md 5.14). Check the wording for the text.
- [ ] **Cabane & Farias (2024).** Only the title is known so far, and there is no open access. Read it through the university library or do not cite it. Its placement in the research gap depends on this.

**Read before citing:**

- [ ] **Pariag et al. (2007).** The figure of about 18% comes from a summary, not from the abstract.
- [ ] **Lei et al. (2014).** Read the conclusion in the original. The metadata are confirmed.
- [ ] **Georges et al. (2007).** Passage on warm-up. The paper does not support the claim about non-normal data, see its entry.
- [ ] **Dean & Barroso (2013).** The paper deals with large distributed services. The transfer to server push is a conclusion of this thesis.
- [ ] **Widrow & Kollár (2008).** Conditions for the uniform rounding error and a suitable chapter reference.

**Before submission:**

- [ ] **Online sources.** Access them once more and update `urldate`. Documentation changes, and the addresses of Laravel and Mercure have already moved since the first access.
- [ ] **Proposals.** Resolve the section "Proposals, not read yet" after reading. Whatever is not cited does not appear in the bibliography anyway.

**Already confirmed on 2026-11-03.** Crossref metadata of all entries with a DOI, status of all RFCs (none is obsoleted), abstract of Murley et al. (2021), abstract of von Behren et al. (2003), the limit of six connections at MDN, the support periods at php.net, `block_for` in the Laravel documentation and Section 9.2 of the WHATWG standard.

---

## Related work

### Classification and research gap (draft)

The related work falls into four lines:

1. **Concurrency models of servers.** One process or thread per connection versus event-driven processing (Lauer & Needham 1979, Welsh et al. 2001, von Behren et al. 2003, Pariag et al. 2007). These works provide the theoretical basis for comparing PHP-FPM (one worker per connection) and Node.js (event loop). They study web servers with short requests, not long-lived push connections.
2. **PHP versus Node.js.** Existing comparisons (for example Lei, Ma & Tan 2014) measure classic request-response loads. There, Node.js is described as an event-driven platform for I/O-heavy applications (Tilkov & Vinoski 2010).
3. **Event-driven architecture.** Terms and patterns (Fowler 2017, Hohpe & Woolf 2003), effects on modularity (Farias & Lazzari 2023) and performance (Cabane & Farias 2024), challenges in monitoring and debugging (Laigner et al. 2026), performance models (Woodside 2021). These works consider communication between services, not delivery to many permanently connected clients.
4. **Real time on the web.** WebSockets are widespread, but polling is still more common (Murley et al. 2021). The searches on 2026-10-16 and 2026-11-03 (web search, OpenAlex) found no peer-reviewed study that compares SSE and WebSocket under controlled conditions. Closest are a peer-reviewed paper on HTTP polling versus SSE (Van de Vyvere et al. 2020), a measurement of WebSocket versus polling (Pimentel & Nickerson 2012) and a student thesis that compares SSE and WebSocket directly (Appelqvist & Örnmyr 2017). Beyond these there are blog posts and vendor articles.

**CHECK BY HAND.** **Gap (preliminary, to be confirmed by a search in IEEE Xplore, ACM Digital Library and Google Scholar).** A controlled comparison of PHP and Node.js for delivering server-push messages over long-lived connections (SSE and WebSocket), where the concurrency model matters most, separated by language, framework and queue, with an analysis plan fixed in advance, does not exist in this form.

### Lauer & Needham (1979), duality of the message and procedure models

Hugh C. Lauer, Roger M. Needham. "On the Duality of Operating System Structures." *ACM SIGOPS Operating Systems Review*, 13(2), 3–19, 1979 (first presented in 1978). DOI 10.1145/850657.850658 (confirmed through Crossref on 2026-10-17).

**Content (per summaries).** Operating systems can be divided into message-oriented systems (few processes, explicit message exchange) and procedure-oriented systems. The two models are duals of each other, and neither is fundamentally superior.

**Relevance.** Theoretical starting point of the "threads versus events" debate, in which the comparison of PHP-FPM and Node.js is placed.

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

### Welsh, Culler & Brewer (2001), SEDA

Matt Welsh, David Culler, Eric Brewer. "SEDA: An Architecture for Well-Conditioned, Scalable Internet Services." In *Proceedings of the 18th ACM Symposium on Operating Systems Principles (SOSP)*, 230–243, 2001. DOI 10.1145/502034.502057.

**Content.** Architecture for internet services under high concurrency that splits requests into event-driven stages with queues.

**Relevance.** Event and queue model as a basis for event-driven servers and for the queue axis of the thesis.

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

### von Behren, Condit & Brewer (2003), counterposition to event-driven servers

Rob von Behren, Jeremy Condit, Eric Brewer. "Why Events Are A Bad Idea (for High-Concurrency Servers)." In *Proceedings of HotOS IX*, USENIX, 2003.

**Content (per abstract).** Under high concurrency, threads can match events and lead to simpler code. The weaknesses of threads lie in individual implementations, not in the model.

**Relevance.** Counterposition that keeps the discussion from hastily generalizing the result to "events are fundamentally better".

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

### Pariag et al. (2007), comparison of web server architectures

David Pariag, Tim Brecht, Ashif Harji, Peter Buhr, Amol Shukla, David R. Cheriton. "Comparing the Performance of Web Server Architectures." In *Proceedings of EuroSys 2007*, 231–243, 2007. DOI 10.1145/1272996.1273021 (confirmed through Crossref on 2026-10-17).

**Content (per summary).** Compares an event-driven server, a thread-per-connection server and a pipeline server. The event-driven and pipeline variants achieved about 18% higher throughput than the thread variant.

**Relevance.** Empirical comparison of the concurrency models under controlled conditions, but for short HTTP requests instead of long-lived push connections.

**CHECK BY HAND.** The figure of about 18% is not in the abstract. Check it in the original before citing.

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

### Tilkov & Vinoski (2010), Node.js

Stefan Tilkov, Steve Vinoski. "Node.js: Using JavaScript to Build High-Performance Network Programs." *IEEE Internet Computing*, 14(6), 80–83, 2010. DOI 10.1109/MIC.2010.145 (confirmed through Crossref on 2026-10-17).

**Content (per abstract).** Node.js as a platform for concurrent network programs with asynchronous I/O and an event-driven model instead of multithreading.

**Relevance.** Places Node.js as a representative of the event-driven model.

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

### Lei, Ma & Tan (2014), PHP, Python and Node.js compared

Kai Lei, Yining Ma, Zhi Tan. "Performance Comparison and Evaluation of Web Development Technologies in PHP, Python, and Node.js." In *Proceedings of the 2014 IEEE 17th International Conference on Computational Science and Engineering (CSE)*, 661–668, 2014. DOI 10.1109/CSE.2014.142 (confirmed through Crossref on 2026-11-03).

**Content (per conclusion).** Node.js is said to be lightweight and efficient and suited to I/O-heavy applications, PHP rather to small and medium applications.

**Relevance and distinction.** The most direct predecessor of the language comparison. However, it measures request-response loads, not server push over long-lived connections, and does not separate by framework.

**CHECK BY HAND.** Read the conclusion in the original.

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

### Murley et al. (2021), adoption of WebSockets

Paul Murley, Zane Ma, Joshua Mason, Michael Bailey, Amin Kharraz. "WebSocket Adoption and the Landscape of the Real-Time Web." In *Proceedings of the Web Conference 2021 (WWW '21)*, 1192–1203, 2021. DOI 10.1145/3442381.3450063.

**Content (per abstract).** Analysis of the one million most visited websites. Polling is far more common than WebSockets, whose adoption has recently stagnated. Recommended security practices are often not followed.

**Relevance.** Places the relevance of real-time communication on the web. Shows that push techniques cannot be taken for granted in practice.

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

### Hohpe & Woolf (2003), Enterprise Integration Patterns

Gregor Hohpe, Bobby Woolf. *Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions*. Addison-Wesley, 2003. ISBN 978-0-321-20068-6.

**Content.** Catalog of patterns for message-based integration, including message channels such as publish-subscribe.

**Relevance.** Terms and foundations for Redis Pub/Sub and the queues in the fundamentals chapter.

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

## Event-driven architecture (sources from the proposal)

The proposal names ten sources. Three of them already appear elsewhere (Hohpe & Woolf 2003, Laravel Queues, WHATWG Server-Sent Events). The others were checked individually on 2026-10-17, the record through Crossref, arXiv or the publisher's page, the content through the abstract. Only sources that support a concrete statement of the thesis are adopted. Two details of the proposal are corrected here (Laigner et al., Farias & Lazzari), and one source is not adopted (Tzialla et al., see below).

### Fielding (2000), REST and event-based integration

Roy Thomas Fielding. *Architectural Styles and the Design of Network-based Software Architectures*. Doctoral dissertation, University of California, Irvine, 2000.

**Content.** Derives the architectural style REST from network-based architectural styles. Section 3.6.1 describes the style "Event-based Integration" with its advantages and disadvantages.

**Use.** Definition of the request-response model of the web (REST, client-initiated interaction) as the counterpart to push techniques in the fundamentals chapter. Classification of event-based integration (Section 3.6.1). The statement in the proposal that request-response architectures reach limits with frequent updates cannot be supported directly from Fielding in this form. The definition is cited, not an assessment.

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

### Fowler (2017), meanings of "event-driven"

Martin Fowler. "What do you mean by 'Event-Driven'?" Blog post, 2017. https://martinfowler.com/articles/201701-event-driven.html

**Content.** Distinguishes four patterns that are grouped under "event-driven". Event Notification, Event-Carried State Transfer, Event Sourcing and CQRS.

**Use.** Clarification of terms in the fundamentals chapter. The system under study corresponds to the pattern Event Notification with the payload in the event (every scan is distributed to all clients). Note. Not a peer-reviewed contribution. Suitable for terms, not as evidence for empirical statements.

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

Date of the post (February 7, 2017) checked on the page on 2026-10-17.

### Laigner, Almeida, Assunção & Zhou (2026), challenges of event-based communication

Rodrigo Laigner, Ana Carolina Almeida, Wesley K. G. Assunção, Yongluan Zhou. "An Empirical Study on Challenges of Event Management in Microservice Architectures." *ACM Transactions on Software Engineering and Methodology*, 35(8), 1–62, 2026. DOI 10.1145/3776581. Preprint arXiv:2408.00440 (2024).

**Correction to the proposal.** The proposal names SIGMOD 2024. The paper appeared as an arXiv preprint in 2024 and was published in ACM TOSEM in 2026. The published version is cited.

**Content (per abstract).** Empirical study of the practices and challenges in designing, implementing, testing, monitoring and debugging event-based communication between microservices.

**Use.** Motivation (events decouple, but bring difficulties in debugging and monitoring) and placement of RQ3 and of the debugging and monitoring comparison (DECISIONS.md 5.13, 5.22).

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

### Farias & Lazzari (2023), event-driven architecture and modularity

Kleinner Farias, Luan Lazzari. "Event-driven Architecture and REST Architectural Style: An Exploratory Study on Modularity." *Journal of Applied Research and Technology*, 21(3), 338–351, 2023. DOI 10.22201/icat.24486736e.2023.21.3.1764. Preprint L. Lazzari, K. Farias, arXiv:2110.14699 (2021).

**Correction to the proposal.** The proposal cites the arXiv preprint. The peer-reviewed version appeared in a journal in 2023, with a changed title and with Farias as first author. Following the rules of the template, the published version is cited.

**Content (per abstract).** Exploratory study that compares an event-driven and a REST-based implementation of the same application in terms of separation of concerns, coupling, cohesion, complexity and size.

**Use.** Placement of RQ3 (complexity and maintainability) and of the code metrics (DECISIONS.md 5.22). Related work that also captures maintainability through code metrics.

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

### Woodside (2021), performance models of event-driven architectures

Murray Woodside. "Performance Models of Event-Driven Architectures." In *Companion of the ACM/SPEC International Conference on Performance Engineering (ICPE '21)*, 145–149, 2021. DOI 10.1145/3447545.3451203.

**Content (per abstract).** Event-driven architectures improve scalability through stateless servers and asynchronous interaction. The contribution shows how event-driven and blocking, synchronous components can be represented together in a layered queueing model.

**Use.** Fundamentals (scalability through asynchronous interaction) and related work (model-based versus measurement-based performance evaluation). Fits the PHP side of the thesis, where a synchronous execution model (PHP-FPM) delivers events. Note. Short contribution in the companion volume, not a main conference paper.

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

### Cabane & Farias (2024), event-driven architecture and performance (addition, not in the proposal)

Hebert Cabane, Kleinner Farias. "On the impact of event-driven architecture on performance: An exploratory study." *Future Generation Computer Systems*, 153, 52–69, 2024. DOI 10.1016/j.future.2023.10.021.

Found while checking Farias & Lazzari. Record confirmed through Crossref. The abstract could not be retrieved through the open interfaces. The content is therefore known only from the title and must be read before any use.

**CHECK BY HAND.** Searched again on 2026-11-03, still no abstract and no open access. Read it through the university library or do not cite it.

**Use (planned).** Related work, empirical study of the performance of event-driven architectures. Distinction from the measurement in this thesis (delivery to many long-lived client connections instead of communication between services, if reading confirms this).

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

### Checked and not adopted, Tzialla et al. (2024)

Ioanna Tzialla, Jeffery Wang, Jingyi Zhu, Aurojit Panda. "Efficient Auditing of Event-driven Web Applications." In *Proceedings of the 19th European Conference on Computer Systems (EuroSys '24)*, 2024. DOI 10.1145/3627703.3650089.

The proposal cites the paper for challenges in monitoring and auditing event-driven systems. There, however, "auditing" means checking whether a server executed a web application faithfully (record-replay for Node.js applications on untrusted servers). That is a question of integrity, not of observability in operation, and touches no statement of this thesis. For challenges in monitoring and debugging, Laigner et al. (2026) is the suitable source.

## Empirical software engineering, validity framework

### Wohlin et al. (2024), experiment design and validity

Claes Wohlin, Per Runeson, Martin Höst, Magnus C. Ohlsson, Björn Regnell, Anders Wesslén. *Experimentation in Software Engineering*, 2nd edition. Springer, 2024. ISBN 978-3-662-69305-6. (First edition 2000/2012, the chapter structure on the types of validity is stable.)

**Use.** Framework of construct validity, internal validity, external validity and statistical conclusion validity (DECISIONS.md 5.8).

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

### Arcuri & Briand (2014), statistical tests in software engineering research

Andrea Arcuri, Lionel Briand. "A Hitchhiker's Guide to Statistical Tests for Assessing Randomized Algorithms in Software Engineering." *Software Testing, Verification and Reliability*, 24(3), 219–250, 2014. DOI 10.1002/stvr.1486.

**Use.** Always report significance tests together with an effect size. With enough runs, almost any difference becomes significant, even one without practical value. The paper also names the paired Wilcoxon test for paired data (DECISIONS.md 5.8). Checked in the full text on 2026-11-03.

**CHECK BY HAND.** The paper recommends the effect measure A12 by Vargha & Delaney. Cliff's delta and Romano et al. do not appear in it. It therefore does not support the choice of effect measure and thresholds. Its main recommendation for unpaired data is the U test.

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

## Significance test

### Wilcoxon (1945), signed-rank test

Frank Wilcoxon. "Individual Comparisons by Ranking Methods." *Biometrics Bulletin*, 1(6), 80–83, 1945.

**Use.** Paired significance test (DECISIONS.md 5.8) on the run pairs of the alternating design. Distribution-free, without an assumption of normality. Implementation. `tools/orchestrate/stats.js` (`wilcoxonSignedRank`), exact null distribution up to 50 pairs without ties, otherwise normal approximation with continuity and tie correction. Not to be confused with the unpaired rank-sum test from the same paper.

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

### Mann & Whitney (1947), unpaired U test (replaced)

Henry B. Mann, Donald R. Whitney. "On a Test of Whether one of Two Random Variables is Stochastically Larger than the Other." *The Annals of Mathematical Statistics*, 18(1), 50–60, 1947. DOI 10.1214/aoms/1177730491.

**Status.** Planned method until 2026-10-16, replaced by the paired Wilcoxon test, which uses the pair structure of the alternating design. Documented so that the revision of the decision remains traceable.

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

### Armitage, McPherson & Rowe (1969), repeated testing on accumulating data

P. Armitage, C. K. McPherson, B. C. Rowe. "Repeated Significance Tests on Accumulating Data." *Journal of the Royal Statistical Society, Series A (General)*, 132(2), 235–244, 1969. DOI 10.2307/2343787 (confirmed through Crossref on 2026-10-17).

**Use.** Reason why interim analyses are not a stopping criterion in the main campaigns and why the number of repetitions is fixed in advance from a pilot (DECISIONS.md 5.9). Testing repeatedly on accumulating data and stopping at significance raises the type I error rate well above the nominal level.

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

### Kerr (1998), fixing hypotheses before the results

Norbert L. Kerr. "HARKing: Hypothesizing After the Results are Known." *Personality and Social Psychology Review*, 2(3), 196–217, 1998. DOI 10.1207/s15327957pspr0203_4.

**Use.** Reason for fixing the hypotheses H1–H11 before data collection (DECISIONS.md 5.18). HARKing means presenting a hypothesis derived afterwards from the results as if it had been formulated in advance.

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

## Effect size

### Cliff (1993), Cliff's delta

Norman Cliff. "Dominance Statistics: Ordinal Analyses to Answer Ordinal Questions." *Psychological Bulletin*, 114(3), 494–509, 1993.

**Use.** Classified effect measure (DECISIONS.md 5.8). Ordinal, without the interval scale assumption of Cohen's d, and therefore better suited to latency data than parametric effect measures.

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

### Romano, Kromrey, Coraggio & Skowronek (2006), thresholds for Cliff's delta

Jeanine Romano, Jeffrey D. Kromrey, Jesse Coraggio, Jeff Skowronek. "Appropriate Statistics for Ordinal Level Data: Should We Really Be Using t-test and Cohen's d for Evaluating Group Differences on the NSSE and Other Surveys?" Talk, Annual Meeting of the Florida Association of Institutional Research, 2006.

**Use.** Thresholds fixed in advance (|δ| < 0.147 negligible, < 0.33 small, < 0.474 medium, otherwise large, DECISIONS.md 5.8). Note. Conference contribution without journal peer review. The thesis can mention this openly.

**CHECK BY HAND.** Check the four thresholds in the original, the full text was not available during the review on 2026-11-03. The earlier claim that the thresholds became established through Arcuri & Briand (2014) is not correct and has been removed.

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

### Kerby (2014), rank-biserial correlation for paired data

Dave S. Kerby. "The Simple Difference Formula: An Approach to Teaching Nonparametric Correlation." *Comprehensive Psychology*, 3, 2014. DOI 10.2466/11.IT.3.1 (confirmed through Crossref on 2026-10-17).

**Use.** Effect measure reported in addition to Cliff's delta, r = (W⁺ − W⁻) / (W⁺ + W⁻), which fits the Wilcoxon signed-rank test directly. Share of the rank sum that favors one direction minus the share that speaks against it (DECISIONS.md 5.8).

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

### Vargha & Delaney (2000), related measure, for delimitation

András Vargha, Harold D. Delaney. "A Critique and Improvement of the CL Common Language Effect Size Statistics of McGraw and Wong." *Journal of Educational and Behavioral Statistics*, 25(2), 101–132, 2000. DOI 10.3102/10769986025002101.

**Use.** Delimitation, not the source of the thresholds used. The measure A₁₂ is mathematically equivalent to Cliff's delta (δ = 2·A₁₂ − 1), but Vargha & Delaney use their own, slightly different thresholds.

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

## Multiple comparisons

### Holm (1979), Holm-Bonferroni correction

Sture Holm. "A Simple Sequentially Rejective Multiple Test Procedure." *Scandinavian Journal of Statistics*, 6(2), 65–70, 1979.

**Use.** Correction per test family over 39 planned tests (13 comparisons × 3 load levels, DECISIONS.md 5.8, 5.15). Controls the familywise error rate under any dependence between the tests and has more power than the Bonferroni correction. Implementation. `holmCorrection` in `tools/orchestrate/stats.js`.

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

## Confidence intervals

### Efron & Tibshirani (1993), bootstrap

Bradley Efron, Robert J. Tibshirani. *An Introduction to the Bootstrap*. Chapman & Hall, 1993. ISBN 978-0-412-04231-7.

**Use.** 95% confidence interval for the median of the paired differences (nonparametric bootstrap, percentile method, 10,000 resamples with a fixed seed, DECISIONS.md 5.8). Crossref lists the DOI with the year 1994 (Chapman and Hall/CRC), the first edition of 1993 is cited.

```bibtex
@book{efron1993bootstrap,
  author    = {Efron, Bradley and Tibshirani, Robert J.},
  title     = {An Introduction to the Bootstrap},
  publisher = {Chapman \& Hall},
  date      = {1993},
  doi       = {10.1201/9780429246593},
  langid    = {english}
}
```

## Measurement resolution

### Widrow & Kollár (2008), quantization noise

Bernard Widrow, István Kollár. *Quantization Noise: Roundoff Error in Digital Computation, Signal Processing, Control, and Communications*. Cambridge University Press, 2008. ISBN 978-0-521-88671-0. DOI 10.1017/CBO9780511754661 (confirmed through Crossref on 2026-10-17).

**Use.** Reason for using the mean per run as the test statistic (DECISIONS.md 5.8). If timestamps are rounded to whole milliseconds and the events are not coupled to the millisecond grid, the rounding error is approximately uniform and zero on average. The mean of many rounded values is then finely resolved and unbiased, while the median stays tied to the grid.

**CHECK BY HAND.** Check the conditions for the uniform rounding error and a suitable chapter reference.

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

## Pseudoreplication and unit of analysis

### Hurlbert (1984), pseudoreplication

Stuart H. Hurlbert. "Pseudoreplication and the Design of Ecological Field Experiments." *Ecological Monographs*, 54(2), 187–211, 1984.

**Use.** Reason for using the k6 run instead of the single event as the unit of analysis (DECISIONS.md 5.8). The basic statement, that dependent observations (here events of the same run with shared process state and shared host load) must not enter a test as an independent sample, is accepted across disciplines. The transfer from ecology to software measurements should be briefly explained in the thesis.

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

## Methodology of performance measurements

### Georges, Buytaert & Eeckhout (2007), repeated measurements, warm-up

Andy Georges, Dries Buytaert, Lieven Eeckhout. "Statistically Rigorous Java Performance Evaluation." In *Proceedings of OOPSLA 2007*, 57–76, 2007.

**Use.** Repeated runs and exclusion of warm-up runs (DECISIONS.md 5.9). The paper refers to JVM benchmarks. The underlying problem (nondeterminism from JIT, garbage collection, scheduling) carries over to OPcache, the V8 JIT, connection setup and the file system cache.

**CHECK BY HAND.** Check the passage on warm-up. The transfer to PHP and Node.js is a conclusion of this thesis. Do not cite this paper for non-normal data. Its note on normality in Section 3.2 says that confidence intervals do not require normally distributed data, because of the central limit theorem, and the paper works with parametric methods. Corrected on 2026-11-04 after a search of the full text.

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

### Kalibera & Jones (2013), number of repetitions

Tomas Kalibera, Richard Jones. "Rigorous Benchmarking in Reasonable Time." In *Proceedings of the 2013 International Symposium on Memory Management (ISMM)*, 63–74, 2013. DOI 10.1145/2464157.2464160.

**Use.** Fixing the number of repetitions from pilot data instead of across the board (DECISIONS.md 5.9). The actual nondeterminism of a benchmark is often lower than assumed. Repetitions belong where the uncertainty actually lies.

**CHECK BY HAND.** Confirm the use above in the original. Do not cite this paper for non-normal data. Its paragraph on normality says that parametric methods have been found robust under various conditions, even though the central limit theorem does not fully justify them. The earlier claim "far fewer pairs suffice" in DECISIONS.md 5.9 went beyond the paper and has been reworded. Corrected on 2026-11-04 after a search of the full text.

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

### Hoefler & Belli (2015), not assuming a normal distribution

Torsten Hoefler, Roberto Belli. "Scientific Benchmarking of Parallel Computing Systems: Twelve Ways to Tell the Masses When Reporting Performance Results." In *Proceedings of the International Conference for High Performance Computing, Networking, Storage and Analysis (SC15)*, 1–12, 2015. DOI 10.1145/2807591.2807644.

**Use.** Measurement data should not be assumed to be normally distributed without a diagnostic check (rule 6), and nonparametric techniques are the choice when the distribution is unknown (DECISIONS.md 5.8). Also supports reporting variation and confidence intervals. The paper comes from high-performance computing, so the transfer needs a short explanation.

**CHECK BY HAND.** The passages were found by a search of the full text on 2026-11-04. Read them in the original before citing.

```bibtex
@inproceedings{hoefler2015scientific,
  author    = {Hoefler, Torsten and Belli, Roberto},
  title     = {Scientific Benchmarking of Parallel Computing Systems: Twelve Ways to Tell the Masses When Reporting Performance Results},
  booktitle = {Proceedings of the International Conference for High Performance Computing, Networking, Storage and Analysis (SC15)},
  pages     = {1--12},
  date      = {2015},
  doi       = {10.1145/2807591.2807644},
  langid    = {english}
}
```

## Latency from the user perspective

### Dean & Barroso (2013), tail latency

Jeffrey Dean, Luiz André Barroso. "The Tail at Scale." *Communications of the ACM*, 56(2), 74–80, 2013. DOI 10.1145/2408776.2408794.

**Use.** Reason for reporting p95, p99 and the maximum in addition to the mean per run (DECISIONS.md 5.8). In large services, tail latencies shape the user experience more than the average shows.

**CHECK BY HAND.** The paper deals with large distributed services. The transfer to many server-push connections is a conclusion of this thesis.

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

### Nielsen (1993), response time limits

Jakob Nielsen. *Usability Engineering*. Academic Press, Boston, 1993. Chapter 5 (response times). ISBN 0-12-518405-0 (publisher, place and ISBN confirmed through Open Library on 2026-10-17). The author also summarizes the three limits (0.1 s, 1 s, 10 s) online (nngroup.com/articles/response-times-3-important-limits).

**Use.** Latency limit of 1,000 ms in the saturation criterion (DECISIONS.md 5.17). Up to about one second, a delay does not interrupt the flow of thought of users.

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

## Container virtualization, external validity

### Felter, Ferreira, Rajamony & Rubio (2015), overhead of Docker

Wes Felter, Alexandre Ferreira, Ram Rajamony, Juan Rubio. "An Updated Performance Comparison of Virtual Machines and Linux Containers." In *Proceedings of ISPASS 2015*, 171–172, 2015.

**Content (per abstract).** Compares KVM and Docker. Containers perform equal to or better than virtual machines in almost all cases, and both need tuning for I/O-heavy applications.

**Use.** For external validity. The results hold for PHP and Node.js under Docker, not automatically for bare-metal operation.

**CHECK BY HAND.** That the overhead of Docker affects PHP and Node.js alike is not in the source. It is a conclusion of this thesis (same setup and same front proxy for all variants) and must be worded that way in the text. The ISPASS paper has only two pages.

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

## Protocol specifications

### RFC 6455, the WebSocket protocol

I. Fette, A. Melnikov. "The WebSocket Protocol." RFC 6455, IETF, December 2011. DOI 10.17487/RFC6455.

**Use.** Formal definition of WebSocket. Distinction from the Pusher Channels protocol, which Laravel Reverb uses on top (`prototypes/php-laravel/README.md`).

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

### WHATWG HTML Living Standard, Server-Sent Events

WHATWG. "9.2 Server-Sent Events." *HTML Living Standard*. https://html.spec.whatwg.org/multipage/server-sent-events.html (updated continuously, state the access date).

**Use.** Formal definition of SSE. Unlike WebSocket, SSE is not an IETF RFC but part of the WHATWG standard. The thesis can briefly mention this difference in publication status. The standard also specifies that EventSource reestablishes a dropped connection automatically. After a server restart, all clients therefore reconnect almost simultaneously, which is the case of the connection storm phase (DECISIONS.md 5.10).

```bibtex
@online{whatwg-sse,
  author  = {{WHATWG}},
  title   = {{HTML} Living Standard: 9.2 Server-Sent Events},
  url     = {https://html.spec.whatwg.org/multipage/server-sent-events.html},
  urldate = {2026-08-25},
  langid  = {english}
}
```

### RFC 5905, Network Time Protocol version 4

D. Mills, J. Martin (ed.), J. Burbank, W. Kasch. "Network Time Protocol Version 4: Protocol and Algorithms Specification." RFC 5905, IETF, June 2010. DOI 10.17487/RFC5905.

**Use.** Reason why send and receive timestamps come from the same device (load generator, DECISIONS.md 5.14). According to the RFC, clients on fast local networks are typically within a few hundred microseconds, with long poll intervals within a few tens of milliseconds. That is on the order of the measured differences, some of which are below one millisecond.

**CHECK BY HAND.** Until 2026-11-03, this note and DECISIONS.md said that NTP reaches only the millisecond range. The RFC does not say that. Check the wording for the text. The RFC has been updated since (most recently by RFC 9769), but not obsoleted.

```bibtex
@techreport{mills2010ntp,
  author      = {Mills, D. and Martin, J. and Burbank, J. and Kasch, W.},
  title       = {Network Time Protocol Version 4: Protocol and Algorithms
                 Specification},
  institution = {IETF},
  number      = {RFC 5905},
  date        = {2010},
  doi         = {10.17487/RFC5905},
  langid      = {english}
}
```

### RFC 6202, long polling and streaming over HTTP

S. Loreto, P. Saint-Andre, S. Salsano, G. Wilkins. "Known Issues and Best Practices for the Use of Long Polling and Streaming in Bidirectional HTTP." RFC 6202, IETF, April 2011. DOI 10.17487/RFC6202.

**Use.** Definition and limits of long polling and HTTP streaming in the fundamentals chapter (push techniques before SSE and WebSocket).

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

### RFC 9110 and RFC 9112, HTTP semantics and HTTP/1.1

R. Fielding, M. Nottingham, J. Reschke (eds.). "HTTP Semantics." RFC 9110, IETF, June 2022. DOI 10.17487/RFC9110. The same editors. "HTTP/1.1." RFC 9112, IETF, June 2022. DOI 10.17487/RFC9112.

**Use.** HTTP fundamentals on which SSE builds. Persistent connections and the recommendation to clients to limit the number of concurrent connections to a server (RFC 9112, Section 9.4).

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

### RFC 9113, HTTP/2

M. Thomson, C. Benfield (eds.). "HTTP/2." RFC 9113, IETF, June 2022. DOI 10.17487/RFC9113.

**Use.** Multiplexing several streams over one connection as the difference from HTTP/1.1 (DECISIONS.md 5.2, 5.12, fundamentals chapter).

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

### MDN Web Docs, EventSource

Mozilla. "EventSource." *MDN Web Docs*. https://developer.mozilla.org/en-US/docs/Web/API/EventSource

**Use.** Evidence for the limit of six concurrent SSE connections per browser and domain without HTTP/2 (fundamentals chapter, DECISIONS.md 5.2). The limit is a property of browsers, not of the SSE specification. Under HTTP/2, according to MDN, server and client negotiate the number of concurrent streams (default 100).

```bibtex
@online{mdn-eventsource,
  author  = {{Mozilla}},
  title   = {{EventSource}},
  url     = {https://developer.mozilla.org/en-US/docs/Web/API/EventSource},
  urldate = {2026-11-03},
  langid  = {english}
}
```

## Documentation of the technologies used

Official documentation as evidence for how the components used work and are configured (fundamentals, implementation, methodology). The addresses were accessed on 2026-10-16 and checked again on 2026-11-03. Online documentation changes. The cited version is determined by the access date.

### Nginx, proxy, FastCGI and connection processing

nginx.org. "Module ngx_http_proxy_module", "Module ngx_http_fastcgi_module" and "Connection processing methods". https://nginx.org/en/docs/

**Use.** Event-driven connection processing of Nginx (fundamentals, DECISIONS.md 5.1). Buffering of responses (`proxy_buffering`, `fastcgi_buffering`, header `X-Accel-Buffering`), which must be turned off for SSE (DECISIONS.md 5.6.1).

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

### Apache HTTP Server, multi-processing modules

The Apache Software Foundation. "Multi-Processing Modules (MPMs)" and "Apache MPM event". *Apache HTTP Server Version 2.4 Documentation*.

**Use.** Process and thread models of Apache (prefork, worker, event) in the fundamentals chapter and as the reason for choosing Nginx (DECISIONS.md 5.1, 5.11).

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

### Redis, Pub/Sub

Redis Ltd. "Redis Pub/Sub." *Redis Documentation*. https://redis.io/docs/latest/develop/pubsub/

**Use.** How Redis Pub/Sub works and its delivery semantics (at most once, no storage for absent subscribers), DECISIONS.md 5.4, 5.17.

```bibtex
@online{redis-pubsub,
  author  = {{Redis Ltd.}},
  title   = {Redis {Pub/Sub}},
  url     = {https://redis.io/docs/latest/develop/pubsub/},
  urldate = {2026-10-16},
  langid  = {english}
}
```

### Redis, persistence

Redis Ltd. "Redis Persistence." *Redis Documentation*. https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/

**Use.** By default, Redis saves snapshots to disk and uses `fork()` for this, which can cause short pauses with large datasets (DECISIONS.md 5.4).

```bibtex
@online{redis-persistence,
  author  = {{Redis Ltd.}},
  title   = {Redis Persistence},
  url     = {https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/},
  urldate = {2026-11-03},
  langid  = {english}
}
```

### MQTT 5.0

A. Banks, E. Briggs, K. Borgendale, R. Gupta (eds.). "MQTT Version 5.0." OASIS Standard, March 7, 2019. https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html

**Use.** MQTT as the device input of Lokato in the fundamentals and design chapters. Quality of service levels (QoS 0 to 2) compared with the delivery semantics of Redis Pub/Sub. MQTT as an alternative distribution path in the discussion (DECISIONS.md 5.4).

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

**Use.** Queue of the Node.js variant with a queue (jobs, workers, storage in Redis), DECISIONS.md 5.19. By default, BullMQ keeps completed jobs in Redis, and `removeOnComplete` removes them (DECISIONS.md 5.20).

```bibtex
@online{bullmq-docs,
  author  = {{Taskforce.sh}},
  title   = {{BullMQ} Documentation},
  url     = {https://docs.bullmq.io/},
  urldate = {2026-10-16},
  langid  = {english}
}

@online{bullmq-auto-removal,
  author  = {{Taskforce.sh}},
  title   = {Auto-Removal of Jobs: {BullMQ} Documentation},
  url     = {https://docs.bullmq.io/guide/queues/auto-removal-of-jobs},
  urldate = {2026-11-03},
  langid  = {english}
}
```

### Laravel, queues, broadcasting, Reverb, deployment, releases

Laravel. *Laravel 13.x Documentation*, chapters "Queues", "Broadcasting", "Laravel Reverb", "Deployment" and "Release Notes". https://laravel.com/framework/docs/13.x

**Use.** Queue worker and `block_for` (DECISIONS.md 5.19, 5.20), broadcasting through Reverb (WebSocket variant), production configuration with config, route and event caches (DECISIONS.md 5.5), support periods of the Laravel versions as the reason for Laravel 13 (DECISIONS.md 5.23).

```bibtex
@online{laravel-queues,
  author  = {{Laravel}},
  title   = {Queues: Laravel 13.x Documentation},
  url     = {https://laravel.com/framework/docs/13.x/queues},
  urldate = {2026-11-03},
  langid  = {english}
}

@online{laravel-broadcasting,
  author  = {{Laravel}},
  title   = {Broadcasting: Laravel 13.x Documentation},
  url     = {https://laravel.com/framework/docs/13.x/broadcasting},
  urldate = {2026-11-03},
  langid  = {english}
}

@online{laravel-reverb,
  author  = {{Laravel}},
  title   = {Laravel Reverb: Laravel 13.x Documentation},
  url     = {https://laravel.com/framework/docs/13.x/reverb},
  urldate = {2026-11-03},
  langid  = {english}
}

@online{laravel-deployment,
  author  = {{Laravel}},
  title   = {Deployment: Laravel 13.x Documentation},
  url     = {https://laravel.com/framework/docs/13.x/deployment},
  urldate = {2026-11-03},
  langid  = {english}
}

@online{laravel-releases,
  author  = {{Laravel}},
  title   = {Release Notes: Laravel 13.x Documentation},
  url     = {https://laravel.com/framework/docs/13.x/releases},
  urldate = {2026-11-03},
  langid  = {english}
}
```

### Versions of Node.js and PHP

OpenJS Foundation. "Node.js Releases". https://nodejs.org/en/about/previous-releases. The PHP Group. "Supported Versions". https://www.php.net/supported-versions.php

**Use.** Release dates and support status of the measured versions (DECISIONS.md 5.26). On 2026-10-27, the cutoff date of the version rule, the release page listed Node.js 26 as "Current" and Node.js 22 and 24 as LTS. On 2026-11-03, it also lists Node.js 26 as LTS. According to php.net, PHP 8.5 has active support until 2027-12-31 and security fixes until 2029-12-31, PHP 8.4 until 2026-12-31 and 2028-12-31 respectively.

```bibtex
@online{nodejs-releases,
  author  = {{OpenJS Foundation}},
  title   = {Node.js Releases},
  url     = {https://nodejs.org/en/about/previous-releases},
  urldate = {2026-10-27},
  langid  = {english}
}

@online{php-supported-versions,
  author  = {{The PHP Group}},
  title   = {Supported Versions},
  url     = {https://www.php.net/supported-versions.php},
  urldate = {2026-11-03},
  langid  = {english}
}
```

### PHP-FPM and the official PHP image

The PHP Group. "FastCGI Process Manager (FPM)" and "Configuration". *PHP Manual*. Docker Official Images. "php" (image documentation).

**Use.** Process model of PHP-FPM, pool configuration (`pm`, `pm.max_children`, `ping.path`), DECISIONS.md 5.5. Recommendation of the official image to use `php.ini-production` in production (DECISIONS.md 5.5).

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

### Symfony and Mercure

Symfony SAS. "Pushing Data to Clients Using the Mercure Protocol." *Symfony Documentation*. https://symfony.com/doc/current/mercure.html. Mercure project. "Install the Mercure.rocks hub." https://mercure.rocks/docs/getting-started/installation

**Use.** Reason why no Symfony variant is measured (DECISIONS.md 5.23). Symfony transmits push messages through Mercure. The long-lived SSE connections are held by a separate hub server, delivered as a Go program or a Caddy module. A Symfony variant would therefore not measure the push path in PHP.

**Additional from the proposal.** Symfony. "Events and Event Listeners." *Symfony Documentation*. https://symfony.com/doc/current/event_dispatcher.html (the address of the component documentation named in the proposal redirects there). The documentation describes the EventDispatcher as an implementation of the Mediator and Observer patterns, through which components of an application communicate by events. Evidence that the EventDispatcher is a mechanism within one process and offers no path to the client (DECISIONS.md 5.23).

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
  title   = {Install the {Mercure.rocks} Hub},
  url     = {https://mercure.rocks/docs/getting-started/installation},
  urldate = {2026-11-03},
  langid  = {english}
}
```

### Ratchet and ReactPHP

Chris Boden et al. *Ratchet Documentation*. http://socketo.me/docs/. ReactPHP project. *ReactPHP*. https://reactphp.org/

**Use.** Event-driven WebSocket server of the minimal PHP variant, based on the ReactPHP event loop (fundamentals, implementation).

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

### Node.js, Express and ws

Node.js Project. "The Node.js Event Loop." *Node.js Learn*. Express. "Production Best Practices: Performance and Reliability." ws. *ws: a Node.js WebSocket library* (README).

**Use.** Event loop of Node.js (fundamentals). Production operation of Express with `NODE_ENV=production` (DECISIONS.md 5.5). WebSocket library of the Node.js variants.

```bibtex
@online{nodejs-event-loop,
  author  = {{Node.js Project}},
  title   = {The {Node.js} Event Loop},
  url     = {https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick},
  urldate = {2026-11-03},
  langid  = {english}
}

@online{express-production,
  author  = {{Express}},
  title   = {Production Best Practices: Performance and Reliability},
  url     = {https://expressjs.com/en/advanced/best-practice-performance/},
  urldate = {2026-11-03},
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

### k6 and xk6-sse

Grafana Labs. *Grafana k6 Documentation*. https://grafana.com/docs/k6/latest/. Pierrick Hymbert. *xk6-sse: A k6 extension for Server-Sent Events*. https://github.com/phymbert/xk6-sse

**Use.** Load tool, virtual users, metrics and summary export (methodology). SSE client of the measurement (DECISIONS.md 3).

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

### Linux cgroup v2 and docker stats

The Linux Kernel Documentation. "Control Group v2." https://docs.kernel.org/admin-guide/cgroup-v2.html. Docker Inc. "docker container stats." *Docker Docs*. https://docs.docker.com/reference/cli/docker/container/stats/

**Use.** Resource measurement from `cpu.stat`, `memory.current` and `memory.stat` (DECISIONS.md 5.16, `tools/resource-sampler`). Definition of the working set as in `docker stats` (memory minus `inactive_file`).

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

### Docker Compose

Docker Inc. "Define Services in Docker Compose." *Docker Docs*. https://docs.docker.com/reference/compose-file/services/

**Use.** Healthcheck with `start_period` and `start_interval`, available from Compose 2.20.2 (DECISIONS.md 5.18). `cgroup_parent` for the shared slice of a variant (DECISIONS.md 5.6.2).

```bibtex
@online{docker-compose-services,
  author  = {{Docker Inc.}},
  title   = {Define Services in {Docker Compose}},
  url     = {https://docs.docker.com/reference/compose-file/services/},
  urldate = {2026-11-03},
  langid  = {english}
}
```

### systemd, resource control

The systemd Project. "systemd.resource-control." *systemd Manual*. https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html

**Use.** `CPUQuota`, `MemoryMax` and `MemorySwapMax` as the implementation of the shared budget per variant (DECISIONS.md 5.6.2).

```bibtex
@online{systemd-resource-control,
  author  = {{The systemd Project}},
  title   = {systemd.resource-control: Resource Control Unit Settings},
  url     = {https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html},
  urldate = {2026-11-03},
  langid  = {english}
}
```

### Raspberry Pi, throttling status and kernel

Raspberry Pi Ltd. "Raspberry Pi OS" (section `vcgencmd`) and "config.txt" (section `kernel`). *Raspberry Pi Documentation*. https://www.raspberrypi.com/documentation/computers/

**Use.** Meaning of the throttling status from `vcgencmd get_throttled` as a validity criterion of a run (DECISIONS.md 5.14). On the Pi 5, the firmware loads `kernel_2712.img` with 16 KB pages by default, and `kernel=kernel8.img` selects the common 64-bit kernel (DECISIONS.md 5.10). The page does not state explicitly that this kernel uses 4 KB pages. That was measured on the Pi (DECISIONS.md 5.10).

```bibtex
@online{raspberrypi-os,
  author  = {{Raspberry Pi Ltd}},
  title   = {Raspberry {Pi} {OS}: Raspberry {Pi} Documentation},
  url     = {https://www.raspberrypi.com/documentation/computers/os.html},
  urldate = {2026-11-03},
  langid  = {english}
}

@online{raspberrypi-config,
  author  = {{Raspberry Pi Ltd}},
  title   = {config.txt: Raspberry {Pi} Documentation},
  url     = {https://www.raspberrypi.com/documentation/computers/config_txt.html},
  urldate = {2026-11-03},
  langid  = {english}
}
```

### Pusher Channels protocol

Pusher Ltd. "Pusher Channels Protocol." *Pusher Channels Documentation*. https://pusher.com/docs/channels/library_auth_reference/pusher-websockets-protocol/

**Use.** Protocol that Laravel Reverb speaks over WebSocket. After the handshake, the server sends `pusher:connection_established`, and then the client subscribes to a channel with `pusher:subscribe`. This is why the subscription is not part of the measured connection setup for Reverb (DECISIONS.md 5.15).

```bibtex
@online{pusher-protocol,
  author  = {{Pusher Ltd.}},
  title   = {Pusher Channels Protocol},
  url     = {https://pusher.com/docs/channels/library_auth_reference/pusher-websockets-protocol/},
  urldate = {2026-11-03},
  langid  = {english}
}
```

### OPcache

The PHP Group. "Runtime Configuration" (OPcache). *PHP Manual*. https://www.php.net/manual/en/opcache.configuration.php

**Use.** Settings `opcache.enable` and `opcache.enable_cli`. The value is recorded for PHP-FPM, and the long-running CLI processes run without OPcache (DECISIONS.md 5.16).

```bibtex
@online{php-opcache,
  author  = {{The PHP Group}},
  title   = {{OPcache} Runtime Configuration},
  url     = {https://www.php.net/manual/en/opcache.configuration.php},
  urldate = {2026-11-03},
  langid  = {english}
}
```

## Technical reference documentation (debugging and monitoring comparison)

Official tool documentation as evidence for the comparison in DECISIONS.md 5.13.

### Node.js, debugger and inspector

Node.js project. "Debugger" and "Inspector", *Node.js API documentation*. https://nodejs.org/api/debugger.html

**Use.** The step debugger (`--inspect`, V8 Inspector or Chrome DevTools protocol) is part of the Node.js core.

```bibtex
@online{nodejs-debugger,
  author  = {{Node.js Project}},
  title   = {Debugger: {N}ode.js {API} Documentation},
  url     = {https://nodejs.org/api/debugger.html},
  urldate = {2026-08-25},
  langid  = {english}
}
```

### Xdebug, installation

Derick Rethans. *Xdebug Documentation, Installation*. https://xdebug.org/docs/install

**Use.** Xdebug is a separate PECL extension and does not ship with PHP.

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

## Sustainability

### United Nations (2015), 2030 Agenda and Sustainable Development Goals

United Nations General Assembly. "Transforming our World: The 2030 Agenda for Sustainable Development." Resolution A/RES/70/1, adopted in September 2015. https://sdgs.un.org/2030agenda

**Use.** Connection of the thesis to the Sustainable Development Goals (SDG 9, 11 and 12) in the introduction and discussion, as required in the course WIA4SE (part 5).

```bibtex
@online{un2015agenda,
  author  = {{United Nations General Assembly}},
  title   = {Transforming our World: The 2030 Agenda for Sustainable Development},
  note    = {Resolution A/RES/70/1},
  date    = {2015},
  url     = {https://sdgs.un.org/2030agenda},
  urldate = {2026-10-18},
  langid  = {english}
}
```

---

## Proposals, not read yet (as of 2026-11-03)

The metadata of these sources are confirmed through Crossref unless noted otherwise. The content comes from the abstracts. **CHECK BY HAND.** Read all sources here in the original first, then either move them to the matching section or delete them. None of them is cited unread.

### Van de Vyvere, Colpaert & Verborgh (2020), polling versus SSE

**Content (per abstract).** Peer-reviewed comparison of HTTP polling and SSE with up to 25,000 clients, measuring scalability, server CPU load and client latency. SSE is better on all three as long as updates should arrive as fast as possible. If users accept a delay of about 10 s, polling serves as many clients.

**Intended for.** Related work, Chapter 3 and the research gap. Closest to this thesis, but it does not compare SSE with WebSocket or PHP with Node.js. It also fits Lokato, which distributes by polling every 500 ms (DECISIONS.md 5.4). Full text freely available.

```bibtex
@inproceedings{vandevyvere2020polling,
  author    = {Van de Vyvere, Brecht and Colpaert, Pieter and Verborgh, Ruben},
  title     = {Comparing a Polling and Push-Based Approach for Live Open Data Interfaces},
  booktitle = {Web Engineering (ICWE 2020)},
  series    = {Lecture Notes in Computer Science},
  publisher = {Springer},
  pages     = {87--101},
  date      = {2020},
  doi       = {10.1007/978-3-030-50578-3_7},
  langid    = {english}
}
```

### Pimentel & Nickerson (2012), WebSocket versus polling

**Content (per abstract).** Measures the one-way latency of sensor data at 4 Hz over WebSocket, HTTP polling and long polling.

**Intended for.** Related work, real time on the web. Peer-reviewed predecessor of a latency measurement for WebSocket, without SSE and without comparing languages.

```bibtex
@article{pimentel2012websocket,
  author       = {Pimentel, Victoria and Nickerson, Bradford G.},
  title        = {Communicating and Displaying Real-Time Data with {WebSocket}},
  journaltitle = {IEEE Internet Computing},
  volume       = {16},
  number       = {4},
  pages        = {45--53},
  date         = {2012},
  doi          = {10.1109/MIC.2012.64},
  langid       = {english}
}
```

### Appelqvist & Örnmyr (2017), SSE and WebSocket compared directly

Blekinge Institute of Technology, found through OpenAlex. The record in the DiVA database could not be retrieved during the review. **CHECK BY HAND.** The type of work and the content are not confirmed yet, only title, authors, year and university.

**Intended for.** Research gap. By its title the most direct comparison of polling, long polling, SSE and WebSocket. Student theses are not peer-reviewed, but the gap must be worded so that it also holds against this one.

```bibtex
@thesis{appelqvist2017performance,
  author      = {Appelqvist, Rasmus and {\"O}rnmyr, Oliver},
  title       = {Performance Comparison of {XHR} Polling, Long Polling, Server Sent Events and {WebSockets}},
  type        = {Thesis},
  institution = {Blekinge Institute of Technology},
  date        = {2017},
  url         = {http://urn.kb.se/resolve?urn=urn:nbn:se:bth-14497},
  urldate     = {2026-11-03},
  langid      = {english}
}
```

### Chaniotis, Kyriakou & Tselikas (2015), performance of Node.js

No abstract available, the content is known only from the title.

**Intended for.** Related work, PHP versus Node.js, as a peer-reviewed addition to Lei et al. (2014), if the full text confirms the comparison with PHP.

```bibtex
@article{chaniotis2015nodejs,
  author       = {Chaniotis, Ioannis K. and Kyriakou, Kyriakos-Ioannis D. and Tselikas, Nikolaos D.},
  title        = {Is {Node.js} a Viable Option for Building Modern Web Applications? {A} Performance Evaluation Study},
  journaltitle = {Computing},
  volume       = {97},
  number       = {10},
  pages        = {1023--1044},
  date         = {2015},
  doi          = {10.1007/s00607-014-0394-9},
  langid       = {english}
}
```

### Mytkowicz, Diwan, Hauswirth & Sweeney (2009), measurement bias from the setup

**Content (per abstract).** Seemingly innocuous aspects of an experimental setup can lead to wrong conclusions (measurement bias).

**Intended for.** Methodology and threats to internal validity. Fits the finding that the healthcheck distorted the CPU time of Redis (DECISIONS.md 5.18).

```bibtex
@inproceedings{mytkowicz2009wrong,
  author    = {Mytkowicz, Todd and Diwan, Amer and Hauswirth, Matthias and Sweeney, Peter F.},
  title     = {Producing Wrong Data Without Doing Anything Obviously Wrong!},
  booktitle = {Proceedings of the 14th International Conference on Architectural Support for Programming Languages and Operating Systems (ASPLOS)},
  pages     = {265--276},
  date      = {2009},
  doi       = {10.1145/1508244.1508275},
  langid    = {english}
}
```

### Barrett et al. (2017), warm-up of virtual machines

**Content (per abstract).** Even small, deterministic benchmarks often fail to reach a steady state of peak performance on common virtual machines, at most 43.5% of the studied pairs do so consistently.

**Intended for.** Threats to internal validity. The 5 warm-up runs assume a steady state. Relevant for Node.js with the V8 JIT. The paper covers microbenchmarks, so the transfer would be a conclusion of this thesis. Full text freely available.

```bibtex
@article{barrett2017warmup,
  author       = {Barrett, Edd and Bolz-Tereick, Carl Friedrich and Killick, Rebecca and Mount, Sarah and Tratt, Laurence},
  title        = {Virtual Machine Warmup Blows Hot and Cold},
  journaltitle = {Proceedings of the ACM on Programming Languages},
  volume       = {1},
  number       = {OOPSLA},
  pages        = {1--27},
  date         = {2017},
  doi          = {10.1145/3133876},
  langid       = {english}
}
```

### Papadopoulos et al. (2021), principles of reproducible measurements (optional)

**Content (per abstract).** Eight methodological principles for performance measurements in the cloud and a literature review of how well they are followed.

**Intended for.** Methodology, if a more recent framework is wanted next to Georges et al. and Kalibera & Jones. It concerns the cloud, not a single test server.

```bibtex
@article{papadopoulos2021methodological,
  author       = {Papadopoulos, Alessandro Vittorio and Versluis, Laurens and Bauer, Andre and Herbst, Nikolas and von Kistowski, Joakim and Ali-Eldin, Ahmed and Abad, Cristina L. and Amaral, Jose Nelson and T{\r{u}}ma, Petr and Iosup, Alexandru},
  title        = {Methodological Principles for Reproducible Performance Evaluation in Cloud Computing},
  journaltitle = {IEEE Transactions on Software Engineering},
  volume       = {47},
  number       = {8},
  pages        = {1528--1543},
  date         = {2021},
  doi          = {10.1109/TSE.2019.2927908},
  langid       = {english}
}
```

### Johnston et al. (2018), single board computers as servers

**Content (per abstract).** Current single board computers such as the Raspberry Pi can run mainstream operating systems and workloads and are cheap and low-power, for example for edge and fog computing.

**Intended for.** Test environment and external validity. Explains why the Pi is a realistic small server. Full text freely available.

```bibtex
@article{johnston2018commodity,
  author       = {Johnston, Steven J. and Basford, Philip J. and Perkins, Colin S. and Herry, Herry and Tso, Fung Po and Pezaros, Dimitrios and Mullins, Robert D. and Yoneki, Eiko and Cox, Simon J. and Singer, Jeremy},
  title        = {Commodity Single Board Computer Clusters and Their Applications},
  journaltitle = {Future Generation Computer Systems},
  volume       = {89},
  pages        = {201--212},
  date         = {2018},
  doi          = {10.1016/j.future.2018.06.048},
  langid       = {english}
}
```

### Found and not proposed

Low visibility or little relevance. They do show that related measurements exist and should be known when wording the gap.

- Fernando & Engel (2025). WebSocket libraries on Node.js and Go, up to 1,000 clients with broadcast latency. *Sinkron*, 9(4), 2051–2060. DOI 10.33395/sinkron.v9i4.15266.
- Sanjaya & Wibhowo (2026). Real-time architectures on the ESP32, including WebSocket and MQTT with SSE. *SISFORMA*, 13(1), 86–92. DOI 10.24167/sisforma.v13i1.15565.
- "Node.js or PHP?" (2023). Compares sorting algorithms, no network load. *Issues in Information Systems*. DOI 10.48009/1_iis_2023_128.

## Overview, source per decision

| DECISIONS.md | Decision | Source(s) |
| ------------ | -------- | --------- |
| Related work | Concurrency models of servers | Lauer & Needham (1979), Welsh et al. (2001), von Behren et al. (2003), Pariag et al. (2007) |
| Related work | PHP and Node.js | Tilkov & Vinoski (2010) and Lei, Ma & Tan (2014) |
| Related work | Real time on the web, messaging | Murley et al. (2021), Hohpe & Woolf (2003) |
| 5.18 | Fixing hypotheses in advance | Kerr (1998) |
| 5.8 | k6 run as the unit of analysis | Hurlbert (1984) |
| 5.8 | Mean per run as the test statistic | Widrow & Kollár (2008) |
| 5.8 | Wilcoxon signed-rank test (paired) | Wilcoxon (1945), Arcuri & Briand (2014) |
| 5.8 | Mann-Whitney U test (replaced) | Mann & Whitney (1947) |
| 5.8 | Cliff's delta and thresholds | Cliff (1993), Romano et al. (2006), see also Vargha & Delaney (2000) |
| 5.8 | Rank-biserial correlation (paired) | Kerby (2014) |
| 5.8 | Bootstrap confidence interval | Efron & Tibshirani (1993) |
| 5.8 | Holm correction per family | Holm (1979) |
| 5.8 | Reporting tail latencies | Dean & Barroso (2013) |
| 5.8 | Nonparametric approach | Hoefler & Belli (2015) |
| 5.8, 5.9 | Validity framework | Wohlin et al. (2024) |
| 5.9 | Warm-up, number of repetitions from a pilot | Georges et al. (2007), Kalibera & Jones (2013) |
| 5.9 | No stopping after interim analysis | Armitage et al. (1969) |
| 5.14 | Timestamps from the same device | RFC 5905 |
| 5.17 | Latency limit in the saturation criterion | Nielsen (1993) |
| External validity | Overhead of Docker (that it affects both languages alike is a conclusion of this thesis) | Felter et al. (2015) |
| Construct validity | Definition of WebSocket and SSE | RFC 6455, WHATWG HTML Living Standard |
| 5.13 | Debugger and profiler built in or additional installation | Node.js documentation, Xdebug documentation |
| Fundamentals | Polling, long polling, streaming | RFC 6202 |
| Introduction, discussion | Connection to the Sustainable Development Goals | United Nations (2015) |
| 5.2, 5.12 | HTTP/1.1, HTTP/2, connection limit in the browser | RFC 9110, RFC 9112, RFC 9113, MDN EventSource |
| 5.1, 5.11 | Nginx event-driven, Apache MPMs | Nginx documentation, Apache documentation |
| 5.6.1 | Buffering in the front proxy turned off for SSE | Nginx documentation (proxy, FastCGI) |
| 5.4, 5.17 | Delivery semantics of Redis Pub/Sub | Redis documentation |
| 5.4 | MQTT as the device input of Lokato, quality of service levels, MQTT as an alternative distribution path | OASIS MQTT 5.0 |
| 5.4 | Push through a broker instead of polling | Fowler (2017), Hohpe & Woolf (2003), RFC 6202 |
| 5.5 | Production operation (php.ini, Laravel caches, `NODE_ENV`) | PHP image documentation, Laravel Deployment, Express Production Best Practices |
| 5.5 | PHP-FPM process model and pool configuration | PHP manual (FPM) |
| 5.19, 5.20 | Queues (BullMQ, Laravel Queue, `block_for`) | BullMQ documentation, Laravel Queues |
| 5.16 | Resource measurement through cgroup v2, working set | Kernel documentation cgroup v2, Docker documentation `docker stats` |
| 3, 5.9 | Load tool k6 and xk6-sse | k6 documentation, xk6-sse |
| 5.9, 5.10 | Staggered connection setup, connection storm after a restart (automatic reconnection of EventSource) | WHATWG Server-Sent Events, k6 documentation |
| 5.23 | Laravel 13 instead of 12 (support period) | Laravel Release Notes |
| 5.26 | Versions by release date | Node.js Releases, PHP Supported Versions, Laravel Release Notes |
| 5.23 | No Symfony variant | Symfony EventDispatcher and Mercure, Mercure hub |
| Fundamentals | Request-response model, event-based integration | Fielding (2000), Fowler (2017), Hohpe & Woolf (2003) |
| Related work | Event-driven architecture (modularity, performance, challenges, models) | Farias & Lazzari (2023), Cabane & Farias (2024), Laigner et al. (2026), Woodside (2021) |
| 5.13, 5.22 | Debugging and monitoring, maintainability | Laigner et al. (2026), Farias & Lazzari (2023) |
| 5.4 | Persistence of Redis | Redis documentation (persistence) |
| 5.6.2 | Budget per variant through systemd slices | systemd.resource-control, Docker Compose |
| 5.10, 5.14 | Throttling status of the Pi, kernel and page size | Raspberry Pi documentation |
| 5.15 | Subscription of Reverb not part of the connection setup | Pusher Channels protocol |
| 5.16 | OPcache in PHP-FPM and in CLI processes | PHP manual (OPcache) |
| 5.18 | Healthcheck only during startup | Docker Compose |
| 5.20 | BullMQ removes completed jobs | BullMQ documentation (auto-removal) |
