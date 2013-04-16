;(function(ko){

    // module scope



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
}(ko));