# Architecture Decision Records

Architecture Decision Records (ADRs) capture decisions that constrain OMDN's
implementation. They explain why a choice was made and when it should be
reconsidered; they do not replace implementation documentation.

## Status vocabulary

- **Proposed**: under discussion and not yet binding.
- **Accepted**: approved and binding for new work.
- **Superseded**: replaced by a later ADR, which must link back to it.
- **Deprecated**: retained for history but no longer recommended.

## Decisions

| ADR                                                   | Decision                                               | Status   |
| ----------------------------------------------------- | ------------------------------------------------------ | -------- |
| [0001](0001-adopt-react-router-framework-mode.md)     | Adopt React Router Framework Mode                      | Accepted |
| [0002](0002-keep-express-as-outer-http-server.md)     | Keep Express as the outer HTTP server                  | Accepted |
| [0003](0003-separate-public-and-private-rendering.md) | Separate public and private rendering and caching      | Accepted |
| [0004](0004-keep-mariadb-sessions-authoritative.md)   | Keep MariaDB sessions authoritative                    | Accepted |
| [0005](0005-use-modular-monolith-boundaries.md)       | Use modular-monolith service and repository boundaries | Accepted |

New ADRs use the next four-digit number and must include context, decision,
consequences, rejected alternatives, and reconsideration triggers.
