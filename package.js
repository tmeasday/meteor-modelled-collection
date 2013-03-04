Package.describe({
  summary: "Wrap Meteor.Collection so it returns objects with a user defined prototype."
});

Package.on_use(function (api) {
  api.add_files('modelled-collection.js', ['client', 'server']);
});

Package.on_test(function(api) {
  api.use('modelled-collection', ['client', 'server']);
  api.use('test-helpers', ['client', 'server']);
  api.use('tinytest', ['client', 'server']);
  
  api.add_files('modelled-collection-tests.js', ['client', 'server']);
});