
#Knockout-Paged.js : A Knockout Paging Plugin

##How does it work?

knockout-paged.js works by extending `ko.observableArray.fn` to include a `paged` method. This method, called as a method of an instantiated `ko.observableArray`, returns the same observable array, except that it has a couple of additional propertied hanging off of it which can be used for paging.  (Note: the underlying array is not modified at all)

###What are the additional properties?

The following properties are added to the instance of the observable array:

- `current` (*Type:* `ko.observable(Number)` ) <br/> An observable of the current page number (starting from 1)
- `pagedItems` (*Type:* `ko.observableArray` ) <br/> An observable array containing only the items of the current page. (ie, the "paged items")
- `pageSize` (*Type:* `Number` ) <br/> The integer value of the page size (default is 10)
- `isLoading` (*Type:* `ko.observable(Boolean)` ) <br/> An observable indicating whether or not data is currently being retrieved from the server (only ever true for Ajaxified datasets)
- `next` (method) <br/> If enabled, loads the next page.
- `previous` (method) <br/> If enabled, loads the previous page.
- `goToPage` (method(`Number`)) <br/> Goes to the designated page. (Indexed starting at 1)
<div></div>

The paged observable array can be created by using one of the three different method signatures:


##How do I use it?



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

You can see the [local data functionality demonstrated in jsFiddle here](http://jsfiddle.net/lelandrichardson/npCB5/)


You can see the [asynchronous functionality demonstrated in jsFiddle here](http://jsfiddle.net/lelandrichardson/r9f2r/)

Unfortunately, the source had to be hacked a little bit in order to work with jsFiddle's JSON echo API, but it demonstrates the asynchronous nature of the pager that can be achieved.  If I get a bit further with this project, I will provide some more complete examples and update this article.


There is also a tutorial on Tech.Pro which was the origin of this plugin:

[Handling Paged Datasets in Knockout.js](http://tech.pro/tutorial/1235/handling-paged-datasets-in-knockoutjs "Handling Paged Datasets in Knockout.js")



##Future Development

As this is a plugin that I believe I myself will use, I would like to keep improving on it.  I am open to suggestions on the best way to do that.  If you have opinions on how this API should change or be improved, please share! (or submit a pull request).

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
