import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Heart, MessageSquare, Shield, Sparkles, Users, Lock, Languages, Clock } from "lucide-react";

const BepawaCare = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-blue-50">
      {/* Hero */}
      <section className="container mx-auto px-4 pt-10 md:pt-16 pb-8">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <Badge variant="secondary" className="mb-4 bg-green-100 text-green-700 border-green-200">
              Bepawa Care
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
              Your Safe Space for Mental Health
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-6">
              Confidential, stigma-free therapy – anywhere in Tanzania. Chat 24/7 or book licensed counselors when you need deeper support.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
                <a href="https://wa.me/255713434625" target="_blank" rel="noreferrer">
                  Chat on WhatsApp
                </a>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
                <Link to="/appointments">Book a Counselor Session</Link>
              </Button>
            </div>
            {/* Trust badges */}
            <div className="flex flex-wrap gap-6 mt-6 text-gray-700">
              <div className="inline-flex items-center gap-2"><Lock className="h-4 w-4 text-green-600" /> Private & Secure</div>
              <div className="inline-flex items-center gap-2"><Clock className="h-4 w-4 text-green-600" /> 24/7 Support</div>
              <div className="inline-flex items-center gap-2"><Languages className="h-4 w-4 text-green-600" /> English & Swahili</div>
            </div>
          </div>
          {/* Hero Illustration */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-green-100/60 to-blue-100/60 rounded-3xl blur-2xl" />
            <div className="relative bg-white border border-gray-100 rounded-3xl shadow-xl overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1600&q=80"
                alt="Calm counseling space representing supportive mental health care"
                className="w-full h-[280px] md:h-[340px] object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-6 md:pb-12">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <Badge variant="outline" className="mb-3 border-green-200 text-green-700">Why Bepawa Care?</Badge>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">Affordable, private, and culturally aware support</h2>
            <p className="text-gray-700 leading-relaxed">
              In Tanzania and across Africa, many people suffer in silence with stress, depression, addiction, trauma, or stigma
              related to HIV and other health challenges. Traditional therapy can be expensive and hard to access. Bepawa Care changes that:
              we bring confidential mental health support to your phone — whether you need quick tools, guidance, or a live counselor.
            </p>
          </div>
          <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6">
            <div className="flex items-start gap-3 mb-4">
              <Shield className="h-6 w-6 text-green-600" />
              <p className="text-gray-700">Private and secure — your information stays with you.</p>
            </div>
            <div className="flex items-start gap-3 mb-4">
              <MessageSquare className="h-6 w-6 text-green-600" />
              <p className="text-gray-700">Access help 24/7 through our chatbot or book a licensed counselor.</p>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-6 w-6 text-green-600" />
              <p className="text-gray-700">Designed with Tanzanian users in mind — respectful, local, and stigma‑free.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <Badge variant="outline" className="mb-6 border-blue-200 text-blue-700">How it works</Badge>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <div className="inline-flex items-center gap-2 text-green-700 mb-1">
                <Sparkles className="h-5 w-5" />
                <span className="uppercase tracking-wide text-xs font-semibold">Bepawa Care Lite</span>
              </div>
              <CardTitle className="text-xl">Free Chatbot Support</CardTitle>
              <CardDescription>24/7 confidential mental health chatbot with tools and tips.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-700">
              <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" /> FAQs on stress, depression, trauma, relationships, substance use, HIV stigma</div>
              <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" /> Self-check tools (stress, depression, anxiety scales)</div>
              <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" /> Coping exercises (breathing, mindfulness, journaling)</div>
              <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" /> English and Swahili support</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <div className="inline-flex items-center gap-2 text-blue-700 mb-1">
                <Heart className="h-5 w-5" />
                <span className="uppercase tracking-wide text-xs font-semibold">Guided Therapy</span>
              </div>
              <CardTitle className="text-xl">Standard Care</CardTitle>
              <CardDescription>Affordable counseling sessions via chat or WhatsApp.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-700">
              <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" /> Licensed Tanzanian counselors</div>
              <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" /> Private sessions when you need deeper support</div>
              <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" /> Discounts for youth and women</div>
              <div className="pt-2">
                <Button asChild className="w-full">
                  <Link to="/appointments">Book a session</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <div className="inline-flex items-center gap-2 text-purple-700 mb-1">
                <Sparkles className="h-5 w-5" />
                <span className="uppercase tracking-wide text-xs font-semibold">Bepawa Care Plus</span>
              </div>
              <CardTitle className="text-xl">Premium Care</CardTitle>
              <CardDescription>Comprehensive therapy with priority access and multi-channel support.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-700">
              <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" /> Unlimited chatbot + priority counselor sessions</div>
              <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" /> Video or in-person booking</div>
              <div className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" /> Specialized therapy: trauma recovery, HIV stigma & disclosure, family/relationship, addiction</div>
              <div className="pt-2">
                <Button variant="outline" asChild className="w-full">
                  <a href="https://wa.me/255713434625" target="_blank" rel="noreferrer">Talk to a counselor</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* HIV Prevention Services */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <Badge variant="outline" className="mb-3 border-emerald-200 text-emerald-700">HIV Prevention</Badge>
          <h3 className="text-3xl font-bold text-gray-900">Comprehensive HIV Prevention & Support</h3>
          <p className="text-gray-600 mt-2">Bepawa provides confidential, stigma-free access to HIV prevention tools — from self-testing to PrEP and PEP services.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-md bg-white text-center">
            <CardContent className="p-6 space-y-3">
              <Shield className="h-10 w-10 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-lg">HIV Self-Testing</h4>
              <p className="text-sm text-gray-600">Order confidential HIV self-test kits delivered to your door. Private, accurate, and easy to use.</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-white text-center">
            <CardContent className="p-6 space-y-3">
              <Shield className="h-10 w-10 text-blue-600 mx-auto" />
              <h4 className="font-bold text-lg">PrEP Access</h4>
              <p className="text-sm text-gray-600">Pre-Exposure Prophylaxis — daily prevention medicine. Book through nearby health facilities.</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-white text-center">
            <CardContent className="p-6 space-y-3">
              <Shield className="h-10 w-10 text-purple-600 mx-auto" />
              <h4 className="font-bold text-lg">PEP Access</h4>
              <p className="text-sm text-gray-600">Post-Exposure Prophylaxis — emergency medicine within 72 hours. Time-sensitive, available now.</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-white text-center">
            <CardContent className="p-6 space-y-3">
              <Heart className="h-10 w-10 text-green-600 mx-auto" />
              <h4 className="font-bold text-lg">AI-Guided Consultations</h4>
              <p className="text-sm text-gray-600">Our AI assistant provides confidential risk assessment, education, and next-step guidance in your language.</p>
            </CardContent>
          </Card>
        </div>
        <div className="text-center mt-6">
          <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
            <Link to="/prep-pep">Browse PrEP & PEP Services</Link>
          </Button>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <Badge variant="secondary" className="mb-3 bg-blue-100 text-blue-700 border-blue-200">Why it matters</Badge>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Access care without barriers</h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" /> Accessible: Therapy via WhatsApp — no extra apps needed.</li>
              <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" /> Affordable: Free chatbot, low-cost counselor sessions.</li>
              <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" /> Local & Relevant: Designed for Tanzania, by Tanzanians.</li>
              <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" /> Stigma-Free: Private and respectful — no judgment.</li>
            </ul>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-6 border border-gray-100">
            <div className="flex flex-col items-center text-center">
              <Heart className="h-10 w-10 text-green-600 mb-3" />
              <p className="text-gray-700 max-w-md">
                Whether you want to self-check your wellbeing or speak with a counselor, Bepawa Care is here for you — in English or Swahili, on your schedule, wherever you are.
              </p>
              <div className="flex gap-3 mt-6">
                <Button asChild>
                  <Link to="/appointments">Book Session</Link>
                </Button>
                <Button variant="outline" asChild>
                  <a href="https://wa.me/255713434625" target="_blank" rel="noreferrer">WhatsApp</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <Badge variant="outline" className="mb-3 border-purple-200 text-purple-700">Trusted by Users</Badge>
          <h3 className="text-3xl font-bold text-gray-900">Real stories of healing and support</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-white border shadow-sm">
            <CardContent className="p-6">
              <p className="text-gray-700 italic mb-4">“The chatbot helped me calm my anxiety at night. Booking a counselor was simple and private.”</p>
              <div className="text-sm text-gray-600">– Aisha, Dar es Salaam</div>
            </CardContent>
          </Card>
          <Card className="bg-white border shadow-sm">
            <CardContent className="p-6">
              <p className="text-gray-700 italic mb-4">“Being able to talk in Swahili made all the difference. I felt understood and respected.”</p>
              <div className="text-sm text-gray-600">– John, Arusha</div>
            </CardContent>
          </Card>
          <Card className="bg-white border shadow-sm">
            <CardContent className="p-6">
              <p className="text-gray-700 italic mb-4">“Affordable and confidential. It’s the first time I felt comfortable seeking help.”</p>
              <div className="text-sm text-gray-600">– Neema, Mwanza</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <Badge variant="outline" className="mb-3 border-gray-200 text-gray-700">FAQs</Badge>
          <h3 className="text-3xl font-bold text-gray-900">Common questions</h3>
          <p className="text-gray-600 mt-2">Quick answers about privacy, costs, and how sessions work.</p>
        </div>
        <div className="max-w-3xl mx-auto bg-white border border-gray-100 rounded-xl shadow-sm p-2 md:p-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Is my information private?</AccordionTrigger>
              <AccordionContent>
                Yes. Your chats and session details are confidential and handled according to strict privacy practices.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>How much does it cost?</AccordionTrigger>
              <AccordionContent>
                The chatbot is free. Counseling sessions are low-cost, with discounts for youth and women. Pricing varies by counselor.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Can I use Swahili?</AccordionTrigger>
              <AccordionContent>
                Absolutely. Bepawa Care supports both English and Swahili.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>How do I book a session?</AccordionTrigger>
              <AccordionContent>
                You can book directly from this page using the “Book a Counselor Session” button, or through WhatsApp for assistance.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger>What are PrEP and PEP?</AccordionTrigger>
              <AccordionContent>
                PrEP (Pre-Exposure Prophylaxis) is a daily medicine to prevent HIV infection. PEP (Post-Exposure Prophylaxis) is emergency medicine taken within 72 hours. Both are available through approved facilities on Bepawa.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-6">
              <AccordionTrigger>Can I order HIV self-test kits?</AccordionTrigger>
              <AccordionContent>
                Yes! Order confidential HIV self-test kits with Cash on Delivery. Private, accurate, and delivered to your door.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12">
        <div className="text-center max-w-2xl mx-auto">
          <h4 className="text-2xl font-bold text-gray-900 mb-3">Start your journey today – your mental health is your right.</h4>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
              <a href="https://wa.me/255713434625" target="_blank" rel="noreferrer">Chat on WhatsApp</a>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
              <Link to="/appointments">Book a Counselor</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-6">
                <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
                <span className="text-xl font-semibold">BEPAWA</span>
              </div>
              <p className="text-gray-400 mb-4 leading-relaxed">
                Tanzania's premier integrated healthcare platform connecting patients, pharmacies, wholesalers, and laboratories.
              </p>
              <div className="flex space-x-2 items-center">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-green-400" fill="currentColor"><path d="M9 16.2l-3.5-3.6L4 14l5 5 11-11-1.5-1.5z"/></svg>
                <span className="text-sm text-gray-300">Licensed Healthcare Platform</span>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-lg">For Patients</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link to="/register" className="hover:text-white transition-colors">Find Medicines</Link></li>
                <li><Link to="/register" className="hover:text-white transition-colors">Upload Prescriptions</Link></li>
                <li><Link to="/pharmacy-directory" className="hover:text-white transition-colors">Find Pharmacies</Link></li>
                <li><Link to="/bepawa-care" className="hover:text-white transition-colors">Bepawa Care</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-lg">For Healthcare Providers</h4>
              <ul className="space-y-3 text-gray-400">
                <li><Link to="/pharmacy" className="hover:text-white transition-colors">Pharmacy Solutions</Link></li>
                <li><Link to="/wholesale" className="hover:text-white transition-colors">Wholesale Platform</Link></li>
                <li><Link to="/lab" className="hover:text-white transition-colors">Lab Management</Link></li>
                <li><Link to="/analytics" className="hover:text-white transition-colors">Analytics Dashboard</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-lg">Support</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="https://wa.me/255713434625" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Healthcare Support (WhatsApp)</a></li>
                <li><Link to="/settings" className="hover:text-white transition-colors">Technical Help</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Training Resources</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Documentation</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 BEPAWA Healthcare Platform. All rights reserved. 
              <span className="mx-2">•</span>
              Transforming healthcare delivery across Tanzania.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default BepawaCare;
