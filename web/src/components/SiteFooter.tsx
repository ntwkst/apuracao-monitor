const YEAR = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="site-footer" role="contentinfo" aria-label="Rodapé NTWKST">
      <div className="site-footer-inner">
        <div className="site-footer-card">
          <div className="site-footer-brand">
            <span className="site-footer-mark" aria-hidden>
              n
            </span>
            <div>
              <h3>ntwkst.</h3>
              <p className="site-footer-tag">Inovação em cada conexão.</p>
            </div>
          </div>
          <p className="site-footer-copy">
            Apuração Monitor é uma ferramenta pessoal NTWKST para acompanhar a noite
            eleitoral. Não substitui o placar oficial do TSE.
          </p>
          <a
            className="site-footer-cta"
            href="https://ntwkst.it"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ir para ntwkst.it
          </a>
          <p className="site-footer-latin">Fiat voluntas tua. Veni, Domine Iesu!</p>
        </div>

        <div className="site-footer-card">
          <div className="site-footer-cols">
            <nav aria-label="Links NTWKST">
              <h4>Menu</h4>
              <a href="https://ntwkst.it/" target="_blank" rel="noopener noreferrer">
                Home
              </a>
              <a href="https://ntwkst.it/?tab=plans" target="_blank" rel="noopener noreferrer">
                Planos
              </a>
              <a href="https://ntwkst.it/?tab=services" target="_blank" rel="noopener noreferrer">
                Serviços
              </a>
              <a href="https://ntwkst.it/?tab=contact" target="_blank" rel="noopener noreferrer">
                Contato
              </a>
              <a href="https://ntwkst.it/status" target="_blank" rel="noopener noreferrer">
                Status
              </a>
            </nav>
            <div>
              <h4>Fale conosco</h4>
              <a href="tel:+5567999211358">+55 (67) 9-9921-1358</a>
              <a href="mailto:contato@ntwkst.it">contato@ntwkst.it</a>
              <p className="site-footer-muted">Chapadão do Sul · MS</p>
              <div className="site-footer-social">
                <a
                  href="https://wa.me/5567999211358"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp"
                >
                  WA
                </a>
                <a
                  href="https://www.instagram.com/ntwkst.it/"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  IG
                </a>
                <a
                  href="https://www.youtube.com/@ntwkstit"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="YouTube"
                >
                  YT
                </a>
              </div>
            </div>
          </div>
          <p className="site-footer-legal">
            © {YEAR} Network Soluções Tecnológicas · Apuração Monitor
          </p>
        </div>
      </div>
    </footer>
  );
}
