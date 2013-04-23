[KnockoutJS][1] is provides the plumbing to create very powerful web applications, but leaves most of the logic up to the developer.  That's great, and I don't think it should be any different, but developers need to look out for common use case scenarios where there is often the potential to be a lot of duplicated boiler-plate code.  One such case (I have found) is creating paged datasets.

##The Simple Case 

Say I just have an array of simple JS/JSON objects, all I want to do is build a `ko.computed` computed observable that simply pulls out the slice of the array that represents the current "page".

Simple. Someone reasonably adept at knockout can knock that out pretty quickly.

Starting with our viewmodel (which in my examples will follow a constructor pattern, however this does not have to be the case):

    var ExampleViewModel = function(data){
        
        // ...  
        // other viewmodel data we don't care about
        // ...
    
        // the array of items that I want to page
        this.items = ko.observableArray(data);
    
    };

Cool. Okay, well I have my viewmodel here... I might as well start slamming some observables related to my pager on there!

    var ExampleViewModel = function(data){
        // stuff that matters
        // ---------------------------------------------
        this.items = ko.observableArray(data);

        // pager related stuff
        // ---------------------------------------------
        this.currentPage = ko.observable(1);
        this.perPage = 10;
        this.pagedItems = ko.computed(function(){
            var pg = this.currentPage(),
                start = this.perPage * (pg-1),
                end = start + this.perPage;
            return this.items().slice(start,end);
        }, this);
        this.nextPage = function(){
            if(this.nextPageEnabled())
                this.currentPage(this.currentPage()+1);
        };
        this.nextPageEnabled = ko.computed(function(){
            return this.items().length > this.perPage * this.currentPage();
        },this);
        this.previousPage = function(){
            if(this.previousPageEnabled())
                this.currentPage(this.currentPage()-1);
        };
        this.previousPageEnabled = ko.computed(function(){
            return this.currentPage() > 1;
        },this);
    };

And there ya have it.  A pager in Knockout.JS. Wiring it up to the view is somewhat trivial:

    <ul class="pager">
        <li data-bind="css: {'disabled': !previousPageEnabled()}">
            <a href="#" data-bind="click: previousPage">Previous</a>
        </li>
        <li data-bind="css: {'disabled': !nextPageEnabled()}">
            <a href="#" data-bind="click: nextPage">Next</a>
        </li>
    </ul>


<iframe style="width:100%;height:520px;" src="http://jsfiddle.net/lelandrichardson/yuvNt/embedded/result,js,html" allowfullscreen="allowfullscreen" frameborder="0"></iframe>

<br>

This is a relatively simple result to accomplish with knockout... but if you feel like this is a little bit lacking, you are not alone.  The problem is there is just a bunch of logic up there that just shouldn't matter to us.  This is not really business logic... it is a common UI implementation that has nothing to do with the core of our application - so I don't want to look at it!  More than that, I have just added a bunch of properties to my viewmodel which might end up getting serialized to JSON and sent to my server, which I don't want.

Even more, this is about *as simple* as your situation will possibly be.  Chances are, you are probably wanting to do something more complicated, like pull data from the server asynchronously via ajax...  In this case, these methods are going to get more and more complicated, making our viewModel even more messy!


##Getting DRY

Nevermind loading data via AJAX for a moment.  Let's just git this thing out of our viewmodel.

In order to do this, we are going to extend the prototype of `ko.observableArray`.  This feels appropriate, since we are typically going to want to page an array, and our viewModel might have several arrays, each of which need to be paged.  This has a slight limitation in that it prevents us from creating a paged array around a plain old JS array (ie, only works on a `ko.observableArray`), but I am okay with that right now.

So, we rework our code a bit and come up with this:

    ko.observableArray.fn.paged = function(perPage){
        var items = this;

        items.current = ko.observable(1);
        items.perPage = perPage;
        items.pagedItems = ko.computed(function(){
            var pg = this.current(),
                start = this.perPage * (pg-1),
                end = start + this.perPage;
            return this().slice(start,end);
        }, items);

        items.next = function(){
            if(this.next.enabled())
                this.current(this.current()+1);
        }.bind(this);

        items.next.enabled = ko.computed(function(){
            return this().length > this.perPage * this.current();
        },items);

        items.prev = function(){
            if(this.prev.enabled())
                this.current(this.current()-1);
        }.bind(this);

        items.prev.enabled = ko.computed(function(){
            return this.current() > 1;
        },items);


        return items;
    };

All of the code here is essentially the same as before.  The main difference here is that we are now hanging all of our pager methods off of the actual `ko.observableArray` instance, instead of our viewModel directly.  **Remember, this is possible because an instance of `ko.observableArray` is actually just a function.  And functions can have properties just like any other object in JavaScript!**

This results in the functionally equivalent, but a *much* cleaner viewmodel:

    var ExampleViewModel = function(){
        this.items = ko.observableArray().paged(10);
    };

And the modified HTML:

    <ul class="pager">
        <li data-bind="css: {'disabled': !items.prev.enabled()}">
            <a href="#" data-bind="click: items.prev">Previous</a>
        </li>
        <li data-bind="css: {'disabled': !items.next.enabled()}">
            <a href="#" data-bind="click: items.next">Next</a>
        </li>
    </ul>


[See jsFiddle Example][2]

But of course, we do gain some other benefit of the added abstraction: the benefit of being DRY. For example, we could have multiple paged arrays in the same View Model if we wanted without sharing any state!

    var Example = function(){
        this.apples = ko.observableArray().paged(10);
        this.oranges = ko.observableArray().paged(20);
    };

##Handling The More Common Case: Lazy-Loaded paged data-sets via AJAX

Paged lists are nothing new.  Turns out there is lots of data on the internet, and it often times is not economical or practical to display it to the user all at once.

The example above helps us stay DRY, but only helps us in the cases where we have all of the data already on the client.  Although this is helpful some of the time, a much more practical scenario is when we have a (potentially) large dataset that is being stored on the server (likely in a database), and we want to display results to the user querying it, but we obviously don't want the client to have to download all of the data at once!

So although the code above is a fun little exercise, it is hard to really say that it is useful.  I like useful things, so let's take another stab at it.

##Being useful: handle any case

So we don't want to just rewrite the above code to work asynchronously, but forget the static case altogether! Let's provide an API that is flexible enough to let the user (read: developer) decided how he/she wants the pager to behave.

To demonstrate this, I am merely going to provide some of the key snippets.  The code here is getting a bit lengthier and the point is lost with boiler-plate logic.

When loading data asynchronously, you want to minimize trips to the server, so we must store whether or not we have retrieved a certain page or not.  To do this, we create a local array called `loaded` which is an array of booleans. Thus, to check if the 5th page has been loaded, we simply see if `loaded[5] === true`.


    var loaded = [true]; // set [0] to true just because.

    var goToPage = function(pg){
        if(loaded[pg]){
            //data is already loaded. change page asynchronously to simulate a *really fast* ajax call
            isLoading(true);
            setTimeout(function(){
                current(pg);
                isLoading(false);
            },0);
        } else {
            // request data from server
            $.get('/path/to/server?pg=' + pg, function(res){
                onPageReceived(pg,res); // handle server response
                isLoading(false);
            });
        }
    };

    var onPageReceived = function(pg,data){
        // append data to items array (in correct spot)
        var start = cfg.pageSize*(pg-1);
            data.unshift(start,0);
        Array.prototype.splice.apply(items(),data);
        items.notifySubscribers();

        loaded[pg] = true; // indicate this page has been loaded
        current(pg); // change current page
    };

The devil might be in the details, but this demonstrates the main mechanics of it all.  The key things to note here are:

1. `.push` is not used to add items to the array.<br/> This is because `.push` adds elements to the end of an array.  Since we are lazy loading, we may end up loading page 3 before we have page 2.  In this scenario we need to add elements to the correct index on the array.  It's kind of messed up that JavaScript arrays let you do this... but that's another discussion in and of itself.

2. even when we have the data, `setTimeout` is used.<br/>This is a rather important principle when writing code for others to use: **Don't write methods that are asynchronous or synchronous only part of the time.** By using `setTimeout` we are effectively emulating an AJAX call that is just really fast.  This allows the user to write code against the `.goToPage()` method in a consistent way.

3. the `items.notifySubscribers()` call is required here.<br/> This is because we are using the array `.splice` method on the underlying array in order to add data to it.  Because we are unwrapping the observable to do this (and never calling the setter method, or any of the special `ko.observableArray` methods), knockout doesn't know that the array has changed.  To let knockout know that the data  has changed, we call the `.notifySubscribers()` method.

Although this works, you may have noticed it only works for asynchronously-loaded datasets, and doesn't allow for much configuration.  Building configurable API's adds a considerable amount of code, and thus I have removed it above.

I did, however, take the time to build a first-version of a knockout plugin [which I have put on github][3]. It allows for the flexibility that I was calling for above, and used the above code as a starting point.

For this plugin, one calls it in an almost identical fashion to the examples above.  The API is as follows:

###What is returned?

When calling `.paged` on a `ko.observableArray` instance, the result is the same observable array, augmented with several different paging-related properties which are added to the observableArray itself (not the underlying array).

The following properties are added:

- `current` (*Type:* `ko.observable(Number)` ) <br/> An observable of the current page number (starting from 1)
- `pagedItems` (*Type:* `ko.observableArray` ) <br/> An observable array containing only the items of the current page. (ie, the "paged items")
- `pageSize` (*Type:* `Number` ) <br/> The integer value of the page size (default is 10)
- `isLoading` (*Type:* `ko.observable(Boolean)` ) <br/> An observable indicating whether or not data is currently being retrieved from the server (only ever true for Ajaxified datasets)
- `next` (method) <br/> If enabled, loads the next page.
- `previous` (method) <br/> If enabled, loads the previous page.
- `goToPage` (method(`Number`)) <br/> Goes to the designated page. (Indexed starting at 1)
<div></div>

The paged observable array can be created by using one of the three different method signatures:

###Page locally available data easily

    // data is already loaded on the client
    .paged(Number pageSize) => ko.observableArray (self)
    
- `pageSize` : A `Number` (Integer expected) indicating the desired page size for the observable array
- **returns** : The `ko.observableArray` instance that `.paged` was called on, augmented with the paging methods

Example:

    var ExampleViewModel = function(){
        this.apples = ko.observableArray().paged(10);
        
        //... data can be loaded at any time
        this.apples.push({type: 'Jazz', state: 'Ripe'});
    };
    

<div></div>
    
###Page server-side dataset with Url Template

    // data is to be loaded via ajax, with a regular URL structure
    .paged(Number pageSize, String templateUrl) => ko.observableArray (self)

- `pageSize` : A `Number` (Integer expected) indicating the desired page size for the observable array
- `templateUrl` : A `String` representing the URL template to be used to grab the data from the server.
- **returns** : The `ko.observableArray` instance that `.paged` was called on, augmented with the paging methods
    
Example:

    var Example = function(){
        // apples is empty. will automatically load first page, and any other page which is requested
        // by using the provided url template
        this.apples = ko.observableArray().paged(10,'/url/to/get/apples?page={page}&pageSize={pageSize}');
    };


<div></div>

###Configure it to do what you need with options hash
    
    .paged(Object config) => ko.observableArray (self)

In this case we simply pass in an object hash with whatever options we want to set.  The following options are made available:


<table class="table table-bordered">
    <tr>
        <th>Name</th>
        <th>Type</th>
        <th>Type</th>
    </tr>
    <tr>
        <td><code>pageSize</code></td>
        <td><code>Number</code></td>
        <td>The desired page size. Expected to be an integer</td>
    </tr>
    <tr>
        <td><code>async</code></td>
        <td><code>Boolean</code></td>
        <td>
            Whether or not the dataset will be loaded asynchronously or not.  
            Note: this may be overridden if async-only options are provided when this is set to 
            false or vice-versa.
        </td>
    </tr>
    <tr>
        <td><code>url</code></td>
        <td><code>String</code></td>
        <td>
            A string template for a URL optionally containing any of the following formatters: <code>{page}</code>, <code>{pageSize}</code>, <code>{start}</code>, <code>{end}</code> which will then be replaced with the corresponding data.  For example, <code>'/resource/list/start/{start}/end/{end}'</code> will produce <code>'/resource/list/start/0/end/10'</code> on initialization with default options. <b>Note: async only</b>
        </td>
    </tr>
    <tr>
        <td></td>
        <td><code>Function</code></td>
        <td>
            A function which will be expected to receive a single parameter which is an object hash containing the properties <code>page</code>, <code>pageSize</code>, <code>start</code>, <code>end</code>, and return the to be requested to get the corresponding page of data. <b>Note: async only</b>
        </td>
    </tr>
    <tr>
        <td><code>cache</code></td>
        <td><code>Boolean</code></td>
        <td>
Boolean representing whether or not the data retrieved from the server should be reused the next time the page is requested.  Default is <code>true</code> <b>Note: async only</b>
        </td>
    </tr>
    <tr>
        <td><code>mapFromServer</code></td>
        <td><code>Function</code></td>
        <td>
A callback function which is called on AJAX success with the AJAX response as the only parameter.  The callback is expected to return the array to be the current page. <b>Note: async only</b>
        </td>
    </tr>
    <tr>
        <td><code>ctor</code></td>
        <td><code>Function</code></td>
        <td>
            A constructor function which will be mapped to the data being pulled from the server. <b>Note: async only</b>
        </td>
    </tr>
    <tr>
        <td><code>ajaxOptions</code></td>
        <td><code>Object</code></td>
        <td>
An options hash to be passed into the jQuery <code>$.ajax</code> method when a page is requested asnchronously. <b>Note: async only</b>
        </td>
    </tr>
</table>


You can see it in action in this fiddle:

<iframe style="width:100%;height:320px;" src="http://jsfiddle.net/lelandrichardson/r9f2r/embedded/result,js,html" allowfullscreen="allowfullscreen" frameborder="0"></iframe>

<br/>
Unfortunately, the source had to be hacked a little bit in order to work with jsFiddle's JSON echo API, but it demonstrates the asynchronous nature of the pager that can be achieved.  If I get a bit further with this project, I will provide some more complete examples and update this article.


##Future Development

As this is a plugin that I believe I myself will use, I would like to keep improving on it.  I am open to suggestions on the best way to do that.  If you have opinions on how this API should change or be improved, please share! (or submit a pull request).

I have the source available on [GitHub: lelandrichardson/knockout-paged][4]

My major plans for it right now (other than fixing bugs and making it more robust) is to add support for RESTful endpoints.

My thoughts is this could go something like this:

    var Example = function(){
        // instead of providing a url template, you would simply provide the resource name 
        // and it would do the rest of the work
        this.apples = ko.observableArray().paged({
            pageSize: 10,
            resource: '/apple'
        });
    };

RESTful API's have an entirely different way of handling paged datasets, which is by sending back one or more "next", "prev", "first", and "last" URLs along with the response.  I intend on adding handling of this by default soon, and I think this could result in a very clean API. I am certainly open to suggestions here as well.


  [1]: http://knockoutjs.com/
  [2]: http://jsfiddle.net/lelandrichardson/BnYMW/
  [3]: https://github.com/lelandrichardson/knockout-paged
  [4]: https://github.com/lelandrichardson/knockout-paged