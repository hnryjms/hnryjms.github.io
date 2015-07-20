---
layout: post
title:  "Demystifying iOS 8 Storage Providers"
date:   2015-04-08
summary: "With iOS 8, Apple introduced App Extensions as a core
feature of the new software. The Document Provider and File Provider
extensions together allow file storage & access while keeping iOS and
the iOS filesystem tightly locked."
---
With iOS 8, Apple introduced App Extensions as a core feature of the new
software. Along with custom keyboards, photo filters and a few other extensions,
Document Provider and File Provider extensions together allow file storage
access while keeping iOS and the iOS filesystem as tightly locked as possible.
Before we can build a Storage Provider, we need to understand what is happening,
and how to read the very inconsistent and non-descriptive documentation from
Apple Developer. There are two parts to the Storage Provider—the Document
Picker (also called “Document Provider” or “UI File Provider”) and the
File Provider (also called “Non-UI File Provider”), and these two parts
function very differently, but need to work together to serve documents from
your service. Here’s how they work.

### Target Types

**Document Picker** is *always* required, and will be the first (and only) thing
users actually see with their eyes on their device. The document picker runs
similar to a traditional app, with a storyboard and visual content. The main
difference between this target and a traditional iOS app is that the Document
Picker launches as a `UIDocumentPickerExtensionViewController` subclass
(skipping a `UIApplicationDelegate` and `UIWindow`). Depending on your
service’s capabilities, you may handle everything by the Document Picker and
opt to delete the File Provider target entirely.

**File Provider** is *usually* necessary, but not required, and will run
silently in the background of the device upon request from the host app. The
File Provider is used to resave the document picked by the Document Picker
after the host app has modified the served file, and is not necessary if you
are not supporting document editing with your Storage Provider. The File
Provider also ends up with several other responsibilities as well—host
applications are allowed to re-request a provided document, thus bypassing the
Document Picker, making the File Provider responsible to ensure that any
updates that may have happened to the provided document externally are
available. iOS may spin up several instances of the File Provider extension in
the background, so you need to be prepared (the reasoning behind this is
unknown).

Collectively, these two targets are referred to as a Storage Provider extension.
It’s also important to note that Apple doesn’t like extensions running
without purpose, and **will** kill your process if you use too much memory,
aren’t actively doing something on the main thread and numerous other
reasons. You also are restricted in the classes you have access to, and are
completely banned from `-[UIApplication sharedApplication]`. If you find crashes
mentioning your `Personality` or random `SIGABRT` terminations, you should look
into your extension weight and device load since extensions are severely limited
compared to containing apps.

### Storage Provider Modes

There are several modes to a Storage Provider, and they can seem very confusing.
Apple Developer’s documentation seemingly copy & pasted the descriptions of
each one to the other, so we need to demystify the different modes.

**Import** is where the host app will be copying a file from your storage
provider into their app (via the `documentStorageURL` middleman). After the
import is complete, the Storage Provider is done handling the document.

**Export to Service** is where the host app is giving you a document (at the
`originalURL` location), and asking you to pick a folder or location to save the
document in your service. After completing the save, your extension is finished
handling the document.

**Open** is similar to Import, only rather than the host app saving your
document within itself, the document is kept in your `documentStorageURL`, and
your File Provider is notified when changes occur to the document (which can
occur several times in one session), asking you to resave it to your service.

**Move to Service** is a mix of Export and Open modes. Your extension is getting
a document from the host app, and needs to pick a location to save the document,
but then the host app will also start editing the newly saved document through
the File Provider once the document is saved, and you will need to resave
any updates.

If you only support the Import and Export modes, you can get away with not
having a File Provider target, and handling everything through the Document
Picker target. Otherwise you need both targets for your app extension.

### Storage Provider Flow

It’s important to keep in mind that your main app will probably *not* be
running when your storage provider is being used, and more than likely is not in
the background either. Apple does not give you any permission to launch your
application in a background mode, or communicate through any channel between
your app extensions and main app (such as XPC on OS X). Your two
extensions need to be fast, memory-conscious and independent to function
properly.

When a host application launches the `UIDocumentPickerViewController`, iOS will
launch your Document Picker extension and give you information about the
`documentPickerMode` your provider launched with as a property of the view
controller (which may or *may not* be set by the time `viewDidLoad` is called).
Once your Document Picker selects an item, you can either download/upload it
(depending on the Mode) inside your document picker and finish by
calling `-[self dismissGrantingAccessToURL:]` with a file URL inside the
`documentStorageURL` that exists, **or** you also have the option of dismissing
the extension pointing to a file URL that does not yet exist, and having the
File Provider write a placeholder file during download, and then use the File
Provider rather than the Document Picker for downloading content. If you do
return a non-existing file URL, Apple requires you to write a placeholder
with metadata about the file that is being downloaded, and you also need to be
sure that the URL string will give your File Provider enough information
regarding where to download the file (relative path in your Service, etc).

After the Document Picker extension grants access to a URL, iOS will search for
any File Provider extension in your App Group and launch it automatically in the
background as the host app is preparing to handle your document. The File
Provider extension is first asked to write a placeholder if the file being
requested does not exist—in this case, you are **required** to write a
placeholder file, however you are able to perform async HTTP URL requests to get
file size, filename or thumbnail data, and call the `completionHandler()` once
you have a placeholder written, or with any error you may encounter. The
template supplied by Xcode for a Storage Provider shows you how to write the
placeholder file with a static fileSize of zero.

<small>Disclaimer: I have personally found that **no** code to write placeholder
metadata explicitly invoked by iOS (the method
`startProvidingPlaceholderAtURL:completionHandler:` is never called), even when
the host app requests
a `NSFileCoordinatorReadingImmediatelyAvailableMetadataOnly` coordinated read
of the returned url **or** when you try any coordinated read of the contents
returned by `+[NSFileProviderExtension placeholderURLforURL:]`. This would
appear to be an Apple bug. There is also no documentation around a coordinated
read on the placeholder metadata written (the coordinated `MetadataOnly` read
is suppose to trigger the File Provider to start providing metadata, according
to Apple Documentation).</small>

Next, the File Provider begins to download the file from your Server. This
happens in the `startProvidingItemAtURL:completionHandler:` method, and calls
the reply block once the download succeeded or failed with an error. If the file
you are providing is already on the file system and you know it’s an
up-to-date copy, you can call the completion handler immediately to start
serving the URL, otherwise you will need to compare the version on the device
file system with the copy on Server, and download the most up-to-date file to
be served if you don’t already have it. You also need to coordinate your write
action, which is also demonstrated in the template supplied by Xcode. Because
you are a background process, it is not important that the main thread is
unblocked, so you can perform synchronous network requests without worry.

At this point, the user is able to access and edit the content of the document
you served through the host app. Your File Provider is still running in the
background, but should have no active tasks being performed. For Import and
Export modes, this is the end of the lifecycle for your Storage Provider
extension.

For Open and Move modes, you need to upload your document when the host app runs
a coordinated write on your document. After the write, the `itemChangedAtURL:`
method of your File Provider is called. It’s important to note that you no
longer have a completion handler for this method. Apple’s reasoning behind
this is still unknown to me. After this method is called and completes
execution, your extension is *immediately* suspended, so you must perform
**only** synchronous actions in this method, requiring you to add dispatch
semaphores and block the calling thread if you must perform async requests.
Also note that your upload may fail if the user is not connected to the
internet; you only receive this call once; and that your extension probably
won’t be running when the network connection is restored. Apple’s solution
to these problems is for you to use `NSURLSession` for uploading your file,
which you enqueued here, and can run even if your extension is suspended or
killed. If you need to perform an authentication before upload, your Server must
be setup to send a `WWW-Authenticate` header and HTTP-Basic, HTTP-Digest,
SSL/TLS Certificate or Server Trust authentication. You also need to store the
login credentials with the URL session, which gets automatically written to the
device keychain, memory or other locations based on the session type.

`NSURLSession` authentication is beyond the scope of this article.

The final step to the File Provider is cleaning up storage space and stopping
the providing of the document. In the `stopProvidingItemAtURL:` method, you
should coordinate a delete of the file you downloaded from your Server, and
according to the Xcode template, manually write the placeholder document with
information about the file (even though it never gets used by iOS).

<small>Disclaimer: I also have not seen this method get called.</small>

### You’re Finished!

At this point, you should have been able to use the complete functionality of
the complex Storage Provider API. Stay tuned for a step-by-step tutorial about
how to implement a Storage Provider into your app using the information from
this post. Please let me know if you find any discrepancies, errors or
ambiguities in this post; or if you find this post helpful when building your
extension and maybe have something you’d like to add.

With the next major iOS release, lets see how much Storage Provider API Apple
deprecates in favor of something else.
