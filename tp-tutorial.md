
###The Simple and Stupid Example

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
        // ...
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


//TODO: jsfiddle example

This is a relatively simple result to accomplish with knockout... but if you feel like this is a little bit lacking, you are not alone.  The problem is there is just a bunch of logic up there that just shouldn't matter to us.  This is not really business logic... it is a common UI implementation that has nothing to do with the core of our application - so I don't want to look at it!  More than that, I have just added a bunch of properties to my viewmodel which might end up getting serialized to JSON and sent to my server, which I don't want.

Even more, this is about *as simple* as your situation will possibly be.  Chances are, you are probably wanting to do something more complicated, like pull data from the server asynchronously via ajax...  In this case, these methods are going to get more and more complicated, making our viewModel even more messy!


###Rinsing off and getting DRY

Nevermind loading data via AJAX for a moment.  Let's just git this thing out of our viewmodel.

In order to do this, we are going to extend the prototype of `ko.observableArray`.  This feels appropriate, since we are typically going to want to page an array, and our viewModel might have several arrays, each of which need to be paged.  This has a slight limitation in that it prevents us from creating a paged array around a plain old JS array, but I am okay with that right now.

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

All of the code here is essentially the same as before.  The main difference here is that we are now hanging all of our pager methods off of the actual `observableArray`, instead of our viewModel.  **Remember, this is possible because an instance of `ko.observableArray` is actually jsut a function.  And functions can have properties just like any other object in JavaScript!**

This results in the functionally equivalent, but *much* cleaner viewmodel:

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


//TODO: jsfiddle example

We do, however, have the benefit of being DRY, and we could even do this on multiple arrays in the same viewmodel if we wanted!

    var Example = function(){
        this.apples = ko.observableArray().paged(10);
        this.oranges = ko.observableArray().paged(20);
    };

###A Recurring Problem

Paged lists are nothing new.  Turns out there is lots of data on the internet, and it often times is not economical or practical to display it to the user all at once.

The example above helps us stay DRY, but only helps in the cases where we have all of the data already.