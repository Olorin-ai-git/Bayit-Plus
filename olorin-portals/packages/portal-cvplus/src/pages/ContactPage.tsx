import React from 'react';
import { Mail, MessageSquare, Phone } from 'lucide-react';

const ContactPage = () => {
  return (
    <div className="min-h-screen bg-wizard-bg-deep py-20 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-4">Contact CVPlus</h1>
          <p className="text-xl text-purple-200">
            Get in touch to learn how CVPlus can accelerate your career
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-gradient-to-br from-purple-900/30 to-violet-900/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-violet-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-purple-300" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Email Us</h3>
            <a href="mailto:cvplus@olorin.ai" className="text-purple-300 hover:text-purple-200">
              cvplus@olorin.ai
            </a>
          </div>

          <div className="bg-gradient-to-br from-purple-900/30 to-violet-900/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-violet-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-purple-300" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Live Chat</h3>
            <p className="text-purple-200">Coming Soon</p>
          </div>

          <div className="bg-gradient-to-br from-purple-900/30 to-violet-900/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-violet-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-purple-300" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Schedule a Call</h3>
            <p className="text-purple-200">Coming Soon</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/30 to-violet-900/30 backdrop-blur-xl rounded-2xl p-8 border border-purple-500/20">
          <h2 className="text-2xl font-bold text-white mb-6">Send us a message</h2>
          <form className="space-y-6">
            <div>
              <label className="block text-purple-200 mb-2">Name</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-purple-950/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-400"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-purple-200 mb-2">Email</label>
              <input
                type="email"
                className="w-full px-4 py-3 bg-purple-950/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-400"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-purple-200 mb-2">Message</label>
              <textarea
                rows={6}
                className="w-full px-4 py-3 bg-purple-950/50 border border-purple-500/30 rounded-lg text-white focus:outline-none focus:border-purple-400"
                placeholder="Tell us how we can help..."
              />
            </div>
            <button
              type="submit"
              className="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-lg font-semibold hover:from-purple-500 hover:to-violet-500 transition-all"
            >
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
