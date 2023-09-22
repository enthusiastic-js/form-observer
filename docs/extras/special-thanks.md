# Special Thanks

Oftentimes, we get amazed by developers who come up with the "newest and greatest" ideas and technologies. In those moments, we can sometimes think, "Wow! They did all of that _on their own_! Astounding!" But in reality, the accomplishments of the developer(s) involved was very likely (if not certainly) built on top of the works of others. Now, don't get me wrong. That doesn't mean that the developer(s) aren't due any kind of honor or respect; it doesn't mean that their ideas weren't unique or novel; and it certainly doesn't mean that they didn't contribute _significantly_ to their success. But it does mean that at times we can forget the others who played a major role in the project's success.

If I'm being honest, I can tend to fall into this trap as well. So I'm holding up this document as a reminder to myself and others of how we got here. Of course, I'm not asserting that the `Form Observer` is the greatest thing created. However, I am happy with what I've made, and I hope others are as well. If there's anything remotely noteworthy about this project, then those who have contributed to its success should be acknowledged.

Below are some of the people I wanted to acknowledge (listed in ascending order for the impact that I believe they had). This list is _non-exhaustive_. I unfortunately cannot list _every single contributor_, as the list would be far too long. And there are definitely indirect contributors who I don't even know. Nonetheless, I've tried to point out the people who -- as far as I know -- have played an especially important role in this accomplishment.

<ol reversed>
  <li>
    <p>All of the maintainers of the dependencies in this project. I want to give special appreciation to...</p>
    <ul>
      <li>
        The <a href="https://www.typescriptlang.org/">TypeScript</a> Team. TS types have helped me avoid <em>a lot</em> of bugs in this codebase, and they've also enabled me to create a good developer experience for others.
      </li>
      <li>
        The <a href="https://testing-library.com/">Testing Library</a> Team. If I didn't have reliable, human-readable ways to test this codebase, I would go insane. While I was writing some of these tests, I caught some sneaky bugs that I otherwise would have missed.
      </li>
    </ul>
  </li>

  <li>
    <p>
      <a href="https://www.mojotech.com/">MojoTech</a>. Thanks for employing me. 🙂 And thanks for giving your employees (including myself) the opportunity to <a href="https://www.mojotech.com/jobs/">explore their own programming ideas</a> each week. Admittedly, most of my work on this project was done in my free time. But having 5 dedicated hours of MojoTime to focus on a single idea or problem has been helpful for making breakthroughs when I've been stuck.
    </p>
  </li>

  <li>
    <p>
      <a href="https://github.com/kentcdodds">@kentcdodds</a>. Your <a href="https://kentcdodds.com/blog/introducing-the-react-testing-library">invention</a> of the Testing Library Family was certainly a <em>huge</em> benefit to this project (and to other testing tools). In addition to that, your online courses have helped me learn a lot about web development. (You have some of the best teaching content I've seen. <a href="https://www.vuemastery.com/">Vue Mastery</a> also does pretty well.) What's been particularly helpful for me is the set of courses you have on <a href="https://testingjavascript.com/">Testing JavaScript</a>. I've carried what I learned there to every codebase I work on -- including this one.
    </p>
  </li>

  <li>
    <p>
      <a href="https://github.com/jcalz">@jcalz</a>. I have no idea who you are, but you <em>saved my life</em> on some <em>heavy</em> TypeScript headaches. You're the reason why I was able to create identifiers that function as constructors and interfaces. And you ended up giving me the inspiration for a <em>functional</em> <code>TypesToListeners&lt;A&gt;</code> type.
    </p>
    <p>
      In particular, I found your insights on <a href="https://stackoverflow.com/questions/64228054/overload-class-type-definition-in-typescript/64229224#64229224">Constructor Types</a> and <a href="https://stackoverflow.com/a/66680470/17777687">Requiring Object Keys</a> exceptionally helpful.
    </p>
  </li>

  <li>
    <p>
      <a href="https://github.com/Marioalexsan">@marioalexsan</a>. Thank you <em>so</em> much for letting me run random design ideas by you. It helped me get a sense of what fit well and what was pure garbage. (Maybe you think what I have now is pure garbage. 😏 Hopefully not. lol.) My conversations with you especially helped me settle on how I wanted to go about handling the <code>configure</code> method of the <code>FormValidityObserver</code>. <em>Big</em> breakthrough for me.
    <p>
    <p>
      Frankly, though they may be scarce, I always appreciate/enjoy our developer conversations. And I admire your curiosity when it comes to modding games. I'm glad to have met you on Discord. You remind me of another smart developer friend...
    </p>
  </li>

  <li>
    <p>
      <a href="https://github.com/Rich-Harris">@Rich-Harris</a> and the other Svelte contributors. Thank you for designing a framework that's <em>painfully</em> different from React. 🙂 I mean that with all sincerity. <code>React Hook Form</code> was actually the original inspiration for this project. And since they register fields by using <code>React Refs</code> that are spread as props into a developer's fields, I originally thought that I would explore something similar.
    </p>
    <p>
      Now, from what I've gathered, Svelte doesn't support spreading <code>bind:this</code> into an element's props, and it doesn't support <a href="https://react.dev/reference/react-dom/components/common#ref-callback"><code>Ref Callbacks</code></a> either... So once I started thinking about how the Svelte-integration of the <code>FormValidityObserver</code> would work, I started getting pretty frustrated. After some discussion on <a href="https://discord.com/channels/457912077277855764/1109831123472756787/1109831123472756787">Discord</a>, I learned that my problem wasn't, "I need ref callbacks". Rather, my problem was, "I need a flexible way to configure form controls". <a href="https://github.com/sveltejs/kit/issues/334#issuecomment-804987028">As you've pointed out before</a>, it's important to identify the <em>true</em> problem.
    </p>
    <p>
      In the end, because of Svelte's design, I was <em>forced</em> to come up with a solution that was simpler, more flexible, and compatible with pure JS <em>and</em> with any given JS framework. This had a <em>significant</em> impact on the design and maintainability of the codebase. It was another big breakthrough. The benefit of having different frameworks that force you into different ways of thinking is that it helps developers writing web apps <em>and developers writing libraries used in web apps</em> avoid common design flaws that they otherwise would have repeated obliviously. So in the end, I'm <em>really</em> thankful for how Svelte was designed when it comes to refs/actions/ref callbacks. I believe it ultimately forced this project to be better.
    </p>
  </li>

  <li>
    <p>
      <a href="https://gomakethings.com/about/">Chris Ferdinandi</a>. Hey! You're another person whom I don't know. 😅 But you were the one who introduced me to <a href="https://gomakethings.com/why-is-javascript-event-delegation-better-than-attaching-events-to-each-element/">event delegation</a>. Frankly speaking, without that knowledge, the <code>FormObserver</code> never would have been a thing -- which also means that the <code>FormStorageObserver</code> and the <code>FormValidityObserver</code> never would have existed either. So... your influence on this project was really huge. Thanks for putting your thoughts on the internet. 🙂
    </p>
  </li>

  <li>
    <p>
      The <a href="https://react-hook-form.com/">React Hook Form</a> Team, and especially the author, <a href="https://github.com/bluebill1049">@bluebill1049</a>. I remember working on codebases using <a href="https://redux-form.com/8.3.0/">Redux Form</a> and <a href="https://formik.org/">Formik</a> and thinking, "This is madness! There <strong>has</strong> to be an easier way for forms!". Then... Lo and behold... React Hook Form shined in the darkness of Google's Search Engine! It gave me simple and performant form validation with a significantly smaller usage of React state.
    </p>
    <p>
      One day, I decided that I wanted to validate fields <code>onchange</code> (<em>not</em> <code>oninput</code>) instead of <code>onblur</code>. But since React Hook Form integrates so tightly with React, I couldn't craft the form validation experience that I wanted. Additionally, I was dissatisfied with the fact that it wasn't easy to find simple form validation libraries like yours for other JS frameworks. Even when I thought I found something plausible, I still wanted a solution that would save me from having to learn a completely new API whenever I changed JS frameworks. (The Testing Library Family does this <em>very</em> well.)
    </p>
    <p>
      In the end, because of the dilemmas that I encountered, I decided to create the <code>FormValidityObserver</code>. Your project proved to me that robust form validation was possible without state, and it was <em>incredibly</em> helpful in helping me think through how to design the API of the <code>FormValidityObserver</code>. At the same time, <a href="https://gomakethings.com/about/">Chris Ferdinandi</a> proved to me that I could respond to events from form fields <em>in a single place</em>. So as I thought about the original versions of the <code>FormValidityObserver</code> (and the <code>FormStorageObserver</code>), I concluded that what I <em>really</em> wanted was a <code>FormObserver</code> that could be specialized to handle specific use cases. And thus, this project was born. It wouldn't have come about without Chris. And even more so, it wouldn't have come about without you, Bill Luo.
    </p>
  </li>

  <li>
    <p>
      The Lord Jesus Christ. (I'm assuming He doesn't need a clarification link.) The Scriptures testify to how You created the entire universe and hold it together (Colossians 1:13-18). That means You created everyone on this list, You created me, and You created (and gave us) the intelligence that allowed us to accomplish everything we've done. Without You, literally none of this would have existed; so it's only fitting that You get the highest place of honor. And being the One who died to save me from my sins (1 Corinthians 15:3-5), You made me someone who seeks to give in various ways -- including through Open Source. That's not a claim to perfection; You know I'm not. But it's an expression of thankfulness.
    </p>
    <p>
      Sometimes I think I may have spent a bit too much of my free time working on this. I know You're fine with me completing it, but maybe I should've spaced out my work more? I don't think my time distribution was perfect, though I tried. Even still... I hope You will accept this.
    </p>
  </li>
</ol>

If the last and most important item of thanks in that list seemed odd to anyone, please understand... As a Christian, I'm very uncomfortable with the idea of giving bountiful thanks to several people while keeping the God who created everything out of the picture. Whether you're religious or not, surely you can understand how that would be unfair and improper. I wanted to express appreciation for those who contributed to the completion of this project, and I can't do that without acknowledging God.

What is a man on his own? I will give thanks to God, and I will honor those who have helped me accomplish this feat.
