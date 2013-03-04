var Model = function(attrs) {
  this.attrs = attrs;
}
Model.prototype.is_model = function() { return true; }
  
assert_record = function(test, record) {
  test.instanceOf(record, Model);
  test.equal(record.is_model(), true);
  test.notEqual(record.attrs, null);
}

Tinytest.add("modelled-collection - basic model support", function (test) {
  var collection = new Meteor.ModelledCollection(null, {ctor: Model});
  test.notEqual(collection.insert({a: '1'}, null));
  
  // test findOne
  var record = collection.findOne();
  test.notEqual(record, null);
  assert_record(test, record);
  
  // various cursor tests
  var cursor = collection.find();
  test.equal(cursor.count(), 1);
  
  cursor.rewind();
  assert_record(test, cursor.fetch().shift());
  
  cursor.rewind();
  var times = 0;
  cursor.forEach(function(record) {
    times += 1;
    assert_record(test, record);
  });
  test.equal(times, 1);
  
  cursor.rewind();
  var ones = cursor.map(function(record) {
    assert_record(test, record);
    return 1;
  });
  test.equal(ones, [1]);
});

Tinytest.add("modelled-collection - observe support", function (test) {
  var collection = new Meteor.ModelledCollection(null, {ctor: Model});
  
  var added_called = 0, changed_called = 0, movedTo_called = 0, removed_called = 0;
  
  collection.find({}, {sort: {order: 1}}).observe({
    added: function(record) {
      added_called += 1;
      assert_record(test, record);
    },
    changed: function(old_record, new_record) {
      changed_called += 1;
      assert_record(test, old_record);
      assert_record(test, new_record);
    },
    movedTo: function(record, fromIndex, toIndex, before) {
      movedTo_called += 1;
      assert_record(test, record);
      before && assert_record(test, before);
    },
    removed: function(record) {
      removed_called += 1;
      assert_record(test, record);
    }
  });
  
  test.equal(added_called, 0);
  
  collection.insert({a: 'foo', order: 1});
  test.equal(added_called, 1);
  
  collection.insert({a: 'bar', order: 2});
  test.equal(added_called, 2);
  
  collection.update({a: 'foo'}, {$set: {a: 'baz'}});
  test.equal(changed_called, 1);
  test.equal(movedTo_called, 0);
  
  collection.update({a: 'bar'}, {$set: {order: -1}});
  test.equal(changed_called, 2);
  
  collection.remove({a: 'bar'});
  test.equal(removed_called, 1);
});

var allowDenyCollection = new Meteor.ModelledCollection('modelled-collection-for-allow-deny', {ctor: Model});

if (Meteor.isServer) {
  allowDenyCollection.allow({
    insert: function(userId, record) {
      if (! record instanceof Model) throw new Meteor.Exception(555);
      return true;
    },
    update: function(userId, records) {
      _.each(records, function(record) {
        if (! record instanceof Model) throw new Meteor.Exception(555);
      });
      return true;
    },
    remove: function(userId, records) {
      _.each(records, function(record) {
        if (! record instanceof Model) throw new Meteor.Exception(555);
      });
      return true;
    }
  });
  allowDenyCollection.deny({
    insert: function(userId, record) {
      if (! record instanceof Model) throw new Meteor.Exception(555);
      return false;
    },
    update: function(userId, records) {
      _.each(records, function(record) {
        if (! record instanceof Model) throw new Meteor.Exception(555);
      });
      return false;
    },
    remove: function(userId, records) {
      _.each(records, function(record) {
        if (! record instanceof Model) throw new Meteor.Exception(555);
      });
      return false;
    }
  })
} else { // isClient
  testAsyncMulti("modelled-collection - allow/deny support", [
    function(test, expect) {
      var id = allowDenyCollection.insert({a: 'b'}, expect(function(err) {
        test.equal(err, undefined);
      }));
      
      allowDenyCollection.update(id, {$set: {a: 'c'}}, expect(function(err) {
        test.equal(err, undefined);
      }));
      
      allowDenyCollection.remove(id, expect(function(err) {
        test.equal(err, undefined);
      }));
    }
  ]);
}
  