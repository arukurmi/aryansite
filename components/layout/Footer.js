import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const socialLinks = [
    {
      name: 'GitHub',
      href: 'https://github.com/arukurmi',
      icon: 'fab fa-github',
      color: 'hover:text-gray-400'
    },
    {
      name: 'LinkedIn',
      href: 'https://www.linkedin.com/in/aryanshkurmi/',
      icon: 'fab fa-linkedin',
      color: 'hover:text-blue-400'
    },
    {
      name: 'Email',
      href: 'mailto:arukurmi22@gmail.com',
      icon: 'fas fa-envelope',
      color: 'hover:text-red-400'
    },
    {
      name: 'Twitter',
      href: 'https://twitter.com/aryanshkurmi',
      icon: 'fab fa-twitter',
      color: 'hover:text-blue-300'
    }
  ]

  const quickLinks = [
    { name: 'About', href: '/#about' },
    { name: 'Experience', href: '/#experience' },
    { name: 'Blog', href: '/blog' },
    { name: 'Contact', href: '/#contact' }
  ]

  return (
    <footer className="relative z-10 bg-dark-900/50 backdrop-blur-sm border-t border-dark-700">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">AK</span>
              </div>
              <span className="text-white font-bold text-lg">Aryansh Kurmi</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              Electrical Engineering Grad turned Software Developer. 
              Building amazing things with code, one commit at a time.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-gray-500 ${social.color} transition-colors duration-300 text-xl`}
                  aria-label={social.name}
                >
                  <i className={social.icon}></i>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-primary-400 transition-colors duration-300 text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold text-lg">Let's Connect</h3>
            <div className="space-y-2">
              <a
                href="mailto:arukurmi22@gmail.com"
                className="flex items-center space-x-2 text-gray-400 hover:text-primary-400 transition-colors duration-300 text-sm"
              >
                <i className="fas fa-envelope"></i>
                <span>arukurmi22@gmail.com</span>
              </a>
              <a
                href="https://github.com/arukurmi"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-400 hover:text-primary-400 transition-colors duration-300 text-sm"
              >
                <i className="fab fa-github"></i>
                <span>github.com/arukurmi</span>
              </a>
              <a
                href="https://www.linkedin.com/in/aryanshkurmi/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-gray-400 hover:text-primary-400 transition-colors duration-300 text-sm"
              >
                <i className="fab fa-linkedin"></i>
                <span>linkedin.com/in/aryanshkurmi</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-dark-700">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-500 text-sm">
              © {currentYear} Aryansh Kurmi. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span>Built with Next.js & Tailwind CSS</span>
              <span>•</span>
              <span>Deployed on Vercel</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
