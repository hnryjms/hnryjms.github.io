---
layout: post
title:  "Codeblocks for WordPress"
date:   2014-05-04
action: "View & Download on GitHub"
action_url: https://github.com/hnryjms/Codeblocks
summary: "Wordpress includes an amazing visual editor for writing posts, but
writing articles that include lines of code is frustrating with Wordpress's
editors, especially for using code highlighting features on your website."
---
Wordpress includes an amazing visual editor for writing posts, but writing
articles that include lines of code is frustrating with Wordpress's editors,
especially for using code highlighting features on your website. **Codeblocks**
([Github](https://github.com/hnryjms/Codeblocks),
[Wordpress Plugin Directory](https://wordpress.org/plugins/codeblocks/)) is the
solution to clean technical-related blog articles using Wordpress. Codeblocks
separates your code from the built-in content editors of Wordpress, and puts
them in their own individual code editors, accessible in your post using
[shortcodes](http://codex.wordpress.org/Shortcode_API). It even features code
highlighting for both editing the post, and for displaying the code on your
website.

[![Codeblocks Admin]({{ site.url }}/assets/codeblocks_adminScreen.png)]({{ site.url }}/assets/codeblocks_adminScreen.png)

Codeblocks is built to use some of Wordpress's most powerful core features,
including hooks and filters, script queuing, and custom post metadata (using
[Advanced Custom Fields](http://www.advancedcustomfields.com)). This means it's
easy for themes and plugins to work together with Codeblocks to make your
Wordpress experience even better. Read on to see how to install and use
Codeblocks, and how you can build themes and plugins that add to Codeblock's
features.

### Getting Started with Codeblocks

The easiest way to install Codeblocks is to let your Wordpress website do it for
you. Search "Codeblocks" from the Add New Plugin page in the Plugins menu and
install the Codeblocks plugin from z43 Studio. Then just click Activate Plugin
and *boom*. You can use Codeblocks now.

Codeblocks makes adding code to your blog posts and pages extremely easy. As you
start writing a new post, you should see the new Codeblocks section below the
content editor. Just click "+ Add Code Block" and give your block a name. There
are numerous different ways to add code blocks into your article, but they all
revolve around using Shortcodes. After you add in the code you're going to be
displaying, just add the correct shortcode where you want the code to be shown
in your post.

The `[codeblock]` shortcode is all you need to add the code into your article.
You have the option of adding the name of the block, or just adding the simple
shortcode on its own. When you don't set the name of the block in the shortcode
**AND** don't set the title of your code blocks below, Codeblocks will
automatically load your code in order—the first time you add `[codeblock]` to
your article, Codeblocks will display your first section of code
(*codeblock_0*), and then Codeblocks will load the following blocks for every
subsequent call to the shortcode (*codeblock_1*, *codeblock_2*...). However,
it's often more organized to give your code blocks a slightly more descriptive
name, like *express_setup* or *jade_login*, and you can then use the
`[codeblock name='express_setup']` style for showing your code blocks.

### Themeing Codeblocks

If you write Wordpress themes, adding your own custom styling to Codeblocks
should be extremely easy, using just a few custom Wordpress filters and hooks.

For the front-end, Codeblocks uses
[Rainbow.js](http://craig.is/making/rainbows), an amazing and
colorful code highlighting Javascript plugin. If you're planning on writing your
own stylesheet for the code on your theme, you are more than welcome to do so,
or you can use one of the many already-created themes available on the
[Rainbow.js GitHub page](https://github.com/ccampbell/rainbow/tree/master/themes).
All you need to do is add in the stylesheet you want and add the modifications
to the Codeblocks hook in your `functions.php` file.

The `codeblocks/rainbow_theme` hook is the main hook for changing the style of
code on your website. Return the URL of the stylesheet and you'll be good to go.
But there's also a few other options for supporting Codeblocks in your theme as
well&mdash;if you return `null`, Codeblocks will completely disable code
highlighting throughout your theme, even if the publisher chose a language for
code highlighting. You can also return `true` for keeping Codeblocks
highlighting enabled, but not adding any actual stylesheet file—this option
would be good if you already have the style tags inside your main stylesheet
file, reducing the number of HTTP-requests for viewers.

{% highlight php startinline %}
add_filter('codeblocks/rainbow_theme', function($oldURL) {

	// COMPLETELY DISABLE CODEBLOCKS
	// return null;

	// DON'T ADD ANY SEPARATE STYLESHEET RESOURCE
	// return true;

	return plugins_url('tomorrow-night.css', __FILE__);
});
{% endhighlight %}
