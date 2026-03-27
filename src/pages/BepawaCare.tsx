import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Heart, MessageSquare, Shield, Sparkles, Users, Lock, Languages, Clock, AlertTriangle, Pill, TestTube } from "lucide-react";

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
                <a href="https://wa.me/255744969325" target="_blank" rel="noreferrer">
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
                  <a href="https://wa.me/255744969325" target="_blank" rel="noreferrer">Talk to a counselor</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* HIV Prevention Services - Overview */}
      <section className="container mx-auto px-4 py-12">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <Badge variant="outline" className="mb-3 border-emerald-200 text-emerald-700">Break the Stigma</Badge>
          <h3 className="text-3xl font-bold text-gray-900">HIV Prevention, Testing & Support</h3>
          <p className="text-gray-600 mt-2">Bepawa provides confidential, stigma-free access to HIV prevention tools — from self-testing to PrEP and PEP services. No judgment, just support.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-md bg-white text-center">
            <CardContent className="p-6 space-y-3">
              <TestTube className="h-10 w-10 text-emerald-600 mx-auto" />
              <h4 className="font-bold text-lg">HIV Self-Testing</h4>
              <p className="text-sm text-gray-600">Order confidential HIV self-test kits delivered to your door. Private, accurate, and easy to use.</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-white text-center">
            <CardContent className="p-6 space-y-3">
              <Shield className="h-10 w-10 text-blue-600 mx-auto" />
              <h4 className="font-bold text-lg">PrEP Access</h4>
              <p className="text-sm text-gray-600">Pre-Exposure Prophylaxis — daily prevention medicine for people at ongoing risk of HIV.</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-white text-center">
            <CardContent className="p-6 space-y-3">
              <AlertTriangle className="h-10 w-10 text-orange-600 mx-auto" />
              <h4 className="font-bold text-lg">PEP Access</h4>
              <p className="text-sm text-gray-600">Post-Exposure Prophylaxis — emergency medicine within 72 hours of possible exposure.</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md bg-white text-center">
            <CardContent className="p-6 space-y-3">
              <Heart className="h-10 w-10 text-green-600 mx-auto" />
              <h4 className="font-bold text-lg">Stigma-Free Support</h4>
              <p className="text-sm text-gray-600">Our AI companion offers private, judgment-free guidance in English or Swahili — anytime you need it.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Detailed PrEP Section */}
      <section className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-3 rounded-xl">
                <Pill className="h-7 w-7 text-blue-700" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">What is PrEP?</h3>
                <p className="text-sm text-blue-700 font-medium">Pre-Exposure Prophylaxis</p>
              </div>
            </div>
            <p className="text-gray-700 mb-4">
              PrEP is a daily pill taken by HIV-negative people who are at ongoing risk of getting HIV. When taken consistently, PrEP reduces the risk of getting HIV from sex by about <strong>99%</strong>.
            </p>
            <div className="space-y-3 mb-6">
              <h4 className="font-semibold text-gray-900">Who should consider PrEP?</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" /> People with an HIV-positive partner</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" /> People who don't consistently use condoms</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" /> People who have had a recent STI</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" /> People who inject drugs and share needles</li>
              </ul>
            </div>
            <div className="space-y-3 mb-6">
              <h4 className="font-semibold text-gray-900">How to get started</h4>
              <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li>Get tested for HIV (must be negative to start PrEP)</li>
                <li>Consult with a healthcare provider through Bepawa</li>
                <li>Get your prescription and regular follow-up testing</li>
                <li>Take your pill daily for maximum protection</li>
              </ol>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link to="/prep-pep">Find PrEP Providers</Link>
              </Button>
              <Button variant="outline" asChild className="border-blue-200 text-blue-700 hover:bg-blue-50">
                <a href="https://wa.me/255744969325?text=I%20want%20to%20learn%20about%20PrEP" target="_blank" rel="noreferrer">Ask About PrEP</a>
              </Button>
            </div>
          </div>

          {/* Detailed PEP Section */}
          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-8 border border-orange-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-orange-100 p-3 rounded-xl">
                <AlertTriangle className="h-7 w-7 text-orange-700" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">What is PEP?</h3>
                <p className="text-sm text-orange-700 font-medium">Post-Exposure Prophylaxis — Time-Sensitive</p>
              </div>
            </div>
            <div className="bg-orange-100/60 border border-orange-200 rounded-lg p-4 mb-4">
              <p className="text-orange-800 font-semibold text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                PEP must be started within 72 hours of possible exposure. The sooner you start, the more effective it is.
              </p>
            </div>
            <p className="text-gray-700 mb-4">
              PEP is a 28-day course of antiretroviral medicine taken after a possible exposure to HIV. It can prevent HIV infection if started quickly.
            </p>
            <div className="space-y-3 mb-6">
              <h4 className="font-semibold text-gray-900">When to consider PEP</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" /> Unprotected sex with someone who may have HIV</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" /> Condom broke or slipped during sex</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" /> Sexual assault</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" /> Shared needles or accidental needle stick</li>
              </ul>
            </div>
            <div className="space-y-3 mb-6">
              <h4 className="font-semibold text-gray-900">What to expect</h4>
              <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li>Contact a provider immediately — don't wait</li>
                <li>Get tested for HIV before starting PEP</li>
                <li>Take the full 28-day course without missing doses</li>
                <li>Follow up with HIV testing at 4-6 weeks and 3 months</li>
              </ol>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="bg-orange-600 hover:bg-orange-700">
                <Link to="/prep-pep">Find PEP Now — Urgent</Link>
              </Button>
              <Button variant="outline" asChild className="border-orange-200 text-orange-700 hover:bg-orange-50">
                <a href="https://wa.me/255744969325?text=I%20need%20urgent%20PEP%20access" target="_blank" rel="noreferrer">WhatsApp for PEP</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* HIV Self-Testing Deep Dive */}
      <section className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 border border-emerald-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-emerald-100 p-3 rounded-xl">
              <TestTube className="h-7 w-7 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">HIV Self-Testing</h3>
              <p className="text-sm text-emerald-700 font-medium">Private, easy, and empowering</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-gray-700 mb-4">
                HIV self-testing lets you check your status privately at home. It's a first step — not a final diagnosis — that connects you to the right care and support.
              </p>
              <div className="space-y-3 mb-4">
                <h4 className="font-semibold text-gray-900">How it works</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Order a kit — delivered in discreet packaging</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Simple oral swab or finger prick — results in 15-20 mins</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Clear instructions included in the kit</li>
                  <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" /> Chat support available if you need help reading results</li>
                </ul>
              </div>
            </div>
            <div>
              <div className="space-y-3 mb-4">
                <h4 className="font-semibold text-gray-900">After your test</h4>
                <div className="bg-white rounded-lg p-4 space-y-3 border border-emerald-100">
                  <div>
                    <p className="font-medium text-gray-900">Negative result ✅</p>
                    <p className="text-sm text-gray-600">Stay protected — consider PrEP if at ongoing risk. Retest every 3 months.</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Positive result</p>
                    <p className="text-sm text-gray-600">This is a screening result. Visit a facility for a confirmatory test. Early treatment leads to a healthy life. You are not alone.</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Invalid result ⚠️</p>
                    <p className="text-sm text-gray-600">The test didn't work properly. Try again with a new kit or visit a facility.</p>
                  </div>
                </div>
              </div>
              <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
                <Link to="/personal-health">Order HIV Self-Test Kit</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stigma & Emotional Support */}
      <section className="container mx-auto px-4 py-10">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-100 p-3 rounded-xl">
              <Heart className="h-7 w-7 text-purple-700" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">You're Not Alone</h3>
              <p className="text-sm text-purple-700 font-medium">Stigma-free emotional support for HIV-related concerns</p>
            </div>
          </div>
          <p className="text-gray-700 mb-6">
            Fear, shame, and confusion around HIV are common — and completely understandable. Whether you're worried about exposure, navigating a diagnosis, or supporting someone you love, Bepawa Care provides a safe, private space to talk, learn, and find your next step.
          </p>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card className="bg-white/80 border-purple-100">
              <CardContent className="p-5 text-center">
                <MessageSquare className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-semibold text-sm mb-1">Confidential Chat</h4>
                <p className="text-xs text-gray-600">Talk to our AI companion 24/7 — no judgment, no records shared</p>
              </CardContent>
            </Card>
            <Card className="bg-white/80 border-purple-100">
              <CardContent className="p-5 text-center">
                <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-semibold text-sm mb-1">Counselor Access</h4>
                <p className="text-xs text-gray-600">Book a session with a licensed counselor who understands HIV-related stigma</p>
              </CardContent>
            </Card>
            <Card className="bg-white/80 border-purple-100">
              <CardContent className="p-5 text-center">
                <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-semibold text-sm mb-1">Safe Disclosure</h4>
                <p className="text-xs text-gray-600">Learn about disclosure at your own pace — when, how, and to whom</p>
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="bg-purple-600 hover:bg-purple-700">
              <a href="https://wa.me/255744969325?text=I%20need%20someone%20to%20talk%20to%20about%20HIV" target="_blank" rel="noreferrer">Talk to Someone Now</a>
            </Button>
            <Button asChild variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50">
              <Link to="/appointments">Book a Counselor</Link>
            </Button>
          </div>
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
                  <a href="https://wa.me/255744969325" target="_blank" rel="noreferrer">WhatsApp</a>
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
              <a href="https://wa.me/255744969325" target="_blank" rel="noreferrer">Chat on WhatsApp</a>
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
                <li><a href="https://wa.me/255744969325" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Healthcare Support (WhatsApp)</a></li>
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
