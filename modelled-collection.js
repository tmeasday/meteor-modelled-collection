(function() {
  // this function takes a callback and wraps it in a function that 
  // converts the numbered arguments into models.
  var wrapCBWithModel = function(cb, ctor) {
    var indices = _.rest(_.toArray(arguments), 2);
    
    return function(/* arguments */) {
      var args = _.map(arguments, function(arg, index) {
        if (arg && _.contains(indices, index)) {
          if (_.isArray(arg))
            return _.map(arg, function(a) { return new ctor(a); });
          else
            return new ctor(arg);
        } else {
          return arg;
        }
      });
      return cb.apply(this, args);
    }
  }
  
  // ModelledCollection wraps a collection, providing the same API
  // whilst initializing all objects that come out with a ctor
  Meteor.ModelledCollection = function(name, options) {
    this.ctor = options.ctor;
    this.collection = new Meteor.Collection(name, options);
  }

  _.extend(Meteor.ModelledCollection.prototype, {
    find: function() {
      var cursor = this.collection.find.apply(this.collection, _.toArray(arguments))
      return new ModelledCursor(cursor, this.ctor);
    },
  
    findOne: function () {
      var object = this.collection.findOne.apply(this.collection, _.toArray(arguments))
      return new this.ctor(object);
    },
    
  });
  
  // XXX: these just pass through to the encapsulated collection. 
  // is this the right behaviour?
  _.each(['insert', 'update', 'remove'], function(method) {
    Meteor.ModelledCollection.prototype[method] = function() {
      return this.collection[method].apply(this.collection, _.toArray(arguments));
    }
  })
  
  var securityModifier = function(ctor, options) {
    if (options.insert)
      options.insert = wrapCBWithModel(options.insert, ctor, 1);
      
    if (options.update)
      options.update = wrapCBWithModel(options.update, ctor, 1);
      
    if (options.remove)
      options.remove = wrapCBWithModel(options.remove, ctor, 1);    
  }
  
  _.extend(Meteor.ModelledCollection.prototype, {
    allow: function(options) {
      securityModifier(this.ctor, options)
      this.collection.allow(options);
    },
    
    deny: function(options) {
      securityModifier(this.ctor, options)
      this.collection.deny(options);
    }
  });
  
  
  // ModelledCursor does the same for cursors
  var ModelledCursor = function(cursor, ctor) {
    this.cursor = cursor;
    this.ctor = ctor;
  }
  
  _.extend(ModelledCursor.prototype, {
    rewind: function() {
      this.cursor.rewind();
    },
    
    forEach: function(callback) {
      var self = this;
      self.cursor.forEach(function(doc) {
        var record = new self.ctor(doc);
        callback(record);
      });
    },
    
    map: function(callback) {
      var self = this;
      var res = [];
      self.forEach(function (doc) {
        res.push(callback(doc));
      });
      return res;
    },
    
    fetch: function() {
      var self = this;
      var res = [];
      self.forEach(function (doc) {
        res.push(doc);
      });
      return res;
    },
    
    count: function() {
      return this.cursor.count();
    },
    
    observe: function(options) {
      var self = this;
      
      if (options.added)
        options.added = wrapCBWithModel(options.added, self.ctor, 0);
      if (options.addedAt) 
        options.addedAt = wrapCBWithModel(options.addedAt, self.ctor, 0, 2);
      
      if (options.changed) 
        options.changed = wrapCBWithModel(options.changed, self.ctor, 0, 1);
      if (options.changedAt) 
        options.changedAt = wrapCBWithModel(options.changedAt, self.ctor, 0, 1);
      
      if (options.removed) 
        options.removed = wrapCBWithModel(options.removed, self.ctor, 0);
      if (options.removedAt)
         options.removedAt = wrapCBWithModel(options.removedAt, self.ctor, 0);
      
      if (options.movedTo)
        options.movedTo = wrapCBWithModel(options.movedTo, self.ctor, 0, 3);
      
      return self.cursor.observe(options);
    }
  });
}());

