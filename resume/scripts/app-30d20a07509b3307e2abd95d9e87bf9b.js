/*
 jQuery UI Sortable plugin wrapper

 @param [ui-sortable] {object} Options to pass to $.fn.sortable() merged onto ui.config
 */

angular.module('ui.sortable', [])
  .value('uiSortableConfig',{})
  .directive('uiSortable', [
    'uiSortableConfig', '$timeout', '$log',
    function(uiSortableConfig, $timeout, $log) {
      return {
        require: '?ngModel',
        link: function(scope, element, attrs, ngModel) {
          var savedNodes;

          function combineCallbacks(first,second){
            if(second && (typeof second === 'function')) {
              return function(e, ui) {
                first(e, ui);
                second(e, ui);
              };
            }
            return first;
          }

          function hasSortingHelper (element, ui) {
            var helperOption = element.sortable('option','helper');
            return helperOption === 'clone' || (typeof helperOption === 'function' && ui.item.sortable.isCustomHelperUsed());
          }

          // thanks jquery-ui
          function isFloating (item) {
            return (/left|right/).test(item.css('float')) || (/inline|table-cell/).test(item.css('display'));
          }

          function afterStop(e, ui) {
            ui.item.sortable._destroy();
          }

          var opts = {};

          // directive specific options
          var directiveOpts = {
            'ui-floating': undefined
          };

          var callbacks = {
            receive: null,
            remove:null,
            start:null,
            stop:null,
            update:null
          };

          var wrappers = {
            helper: null
          };

          angular.extend(opts, directiveOpts, uiSortableConfig, scope.$eval(attrs.uiSortable));

          if (!angular.element.fn || !angular.element.fn.jquery) {
            $log.error('ui.sortable: jQuery should be included before AngularJS!');
            return;
          }

          if (ngModel) {

            // When we add or remove elements, we need the sortable to 'refresh'
            // so it can find the new/removed elements.
            scope.$watch(attrs.ngModel+'.length', function() {
              // Timeout to let ng-repeat modify the DOM
              $timeout(function() {
                // ensure that the jquery-ui-sortable widget instance
                // is still bound to the directive's element
                if (!!element.data('ui-sortable')) {
                  element.sortable('refresh');
                }
              }, 0, false);
            });

            callbacks.start = function(e, ui) {
              if (opts['ui-floating'] === 'auto') {
                // since the drag has started, the element will be
                // absolutely positioned, so we check its siblings
                var siblings = ui.item.siblings();
                angular.element(e.target).data('ui-sortable').floating = isFloating(siblings);
              }

              // Save the starting position of dragged item
              ui.item.sortable = {
                model: ngModel.$modelValue[ui.item.index()],
                index: ui.item.index(),
                source: ui.item.parent(),
                sourceModel: ngModel.$modelValue,
                cancel: function () {
                  ui.item.sortable._isCanceled = true;
                },
                isCanceled: function () {
                  return ui.item.sortable._isCanceled;
                },
                isCustomHelperUsed: function () {
                  return !!ui.item.sortable._isCustomHelperUsed;
                },
                _isCanceled: false,
                _isCustomHelperUsed: ui.item.sortable._isCustomHelperUsed,
                _destroy: function () {
                  angular.forEach(ui.item.sortable, function(value, key) {
                    ui.item.sortable[key] = undefined;
                  });
                }
              };
            };

            callbacks.activate = function(/*e, ui*/) {
              // We need to make a copy of the current element's contents so
              // we can restore it after sortable has messed it up.
              // This is inside activate (instead of start) in order to save
              // both lists when dragging between connected lists.
              savedNodes = element.contents();

              // If this list has a placeholder (the connected lists won't),
              // don't inlcude it in saved nodes.
              var placeholder = element.sortable('option','placeholder');

              // placeholder.element will be a function if the placeholder, has
              // been created (placeholder will be an object).  If it hasn't
              // been created, either placeholder will be false if no
              // placeholder class was given or placeholder.element will be
              // undefined if a class was given (placeholder will be a string)
              if (placeholder && placeholder.element && typeof placeholder.element === 'function') {
                var phElement = placeholder.element();
                // workaround for jquery ui 1.9.x,
                // not returning jquery collection
                phElement = angular.element(phElement);

                // exact match with the placeholder's class attribute to handle
                // the case that multiple connected sortables exist and
                // the placehoilder option equals the class of sortable items
                var excludes = element.find('[class="' + phElement.attr('class') + '"]');

                savedNodes = savedNodes.not(excludes);
              }
            };

            callbacks.update = function(e, ui) {
              // Save current drop position but only if this is not a second
              // update that happens when moving between lists because then
              // the value will be overwritten with the old value
              if(!ui.item.sortable.received) {
                ui.item.sortable.dropindex = ui.item.index();
                var droptarget = ui.item.parent();
                ui.item.sortable.droptarget = droptarget;
                var attr = droptarget.attr('ng-model') || droptarget.attr('data-ng-model');
                ui.item.sortable.droptargetModel = droptarget.scope().$eval(attr);

                // Cancel the sort (let ng-repeat do the sort for us)
                // Don't cancel if this is the received list because it has
                // already been canceled in the other list, and trying to cancel
                // here will mess up the DOM.
                element.sortable('cancel');
              }

              // Put the nodes back exactly the way they started (this is very
              // important because ng-repeat uses comment elements to delineate
              // the start and stop of repeat sections and sortable doesn't
              // respect their order (even if we cancel, the order of the
              // comments are still messed up).
              if (hasSortingHelper(element, ui) && !ui.item.sortable.received &&
                  element.sortable( 'option', 'appendTo' ) === 'parent') {
                // restore all the savedNodes except .ui-sortable-helper element
                // (which is placed last). That way it will be garbage collected.
                savedNodes = savedNodes.not(savedNodes.last());
              }
              savedNodes.appendTo(element);

              // If this is the target connected list then
              // it's safe to clear the restored nodes since:
              // update is currently running and
              // stop is not called for the target list.
              if(ui.item.sortable.received) {
                savedNodes = null;
              }

              // If received is true (an item was dropped in from another list)
              // then we add the new item to this list otherwise wait until the
              // stop event where we will know if it was a sort or item was
              // moved here from another list
              if(ui.item.sortable.received && !ui.item.sortable.isCanceled()) {
                scope.$apply(function () {
                  ngModel.$modelValue.splice(ui.item.sortable.dropindex, 0,
                                             ui.item.sortable.moved);
                });
              }
            };

            callbacks.stop = function(e, ui) {
              // If the received flag hasn't be set on the item, this is a
              // normal sort, if dropindex is set, the item was moved, so move
              // the items in the list.
              if(!ui.item.sortable.received &&
                 ('dropindex' in ui.item.sortable) &&
                 !ui.item.sortable.isCanceled()) {

                scope.$apply(function () {
                  ngModel.$modelValue.splice(
                    ui.item.sortable.dropindex, 0,
                    ngModel.$modelValue.splice(ui.item.sortable.index, 1)[0]);
                });
              } else {
                // if the item was not moved, then restore the elements
                // so that the ngRepeat's comment are correct.
                if ((!('dropindex' in ui.item.sortable) || ui.item.sortable.isCanceled()) &&
                    !hasSortingHelper(element, ui)) {
                  savedNodes.appendTo(element);
                }
              }

              // It's now safe to clear the savedNodes
              // since stop is the last callback.
              savedNodes = null;
            };

            callbacks.receive = function(e, ui) {
              // An item was dropped here from another list, set a flag on the
              // item.
              ui.item.sortable.received = true;
            };

            callbacks.remove = function(e, ui) {
              // Workaround for a problem observed in nested connected lists.
              // There should be an 'update' event before 'remove' when moving
              // elements. If the event did not fire, cancel sorting.
              if (!('dropindex' in ui.item.sortable)) {
                element.sortable('cancel');
                ui.item.sortable.cancel();
              }

              // Remove the item from this list's model and copy data into item,
              // so the next list can retrive it
              if (!ui.item.sortable.isCanceled()) {
                scope.$apply(function () {
                  ui.item.sortable.moved = ngModel.$modelValue.splice(
                    ui.item.sortable.index, 1)[0];
                });
              }
            };

            wrappers.helper = function (inner) {
              if (inner && typeof inner === 'function') {
                return function (e, item) {
                  var innerResult = inner(e, item);
                  item.sortable._isCustomHelperUsed = item !== innerResult;
                  return innerResult;
                };
              }
              return inner;
            };

            scope.$watch(attrs.uiSortable, function(newVal /*, oldVal*/) {
              // ensure that the jquery-ui-sortable widget instance
              // is still bound to the directive's element
              if (!!element.data('ui-sortable')) {
                angular.forEach(newVal, function(value, key) {
                  // if it's a custom option of the directive,
                  // handle it approprietly
                  if (key in directiveOpts) {
                    if (key === 'ui-floating' && (value === false || value === true)) {
                      element.data('ui-sortable').floating = value;
                    }

                    opts[key] = value;
                    return;
                  }

                  if (callbacks[key]) {
                    if( key === 'stop' ){
                      // call apply after stop
                      value = combineCallbacks(
                        value, function() { scope.$apply(); });

                      value = combineCallbacks(value, afterStop);
                    }
                    // wrap the callback
                    value = combineCallbacks(callbacks[key], value);
                  } else if (wrappers[key]) {
                    value = wrappers[key](value);
                  }

                  opts[key] = value;
                  element.sortable('option', key, value);
                });
              }
            }, true);

            angular.forEach(callbacks, function(value, key) {
              opts[key] = combineCallbacks(value, opts[key]);
              if( key === 'stop' ){
                opts[key] = combineCallbacks(opts[key], afterStop);
              }
            });

          } else {
            $log.info('ui.sortable: ngModel not provided!', element);
          }

          // Create sortable
          element.sortable(opts);
        }
      };
    }
  ]);






























var app = angular.module("resume", ['ui.sortable']).run(['$compile', '$rootScope', '$document', function($compile, $rootScope, $document) {
    return $document.on('page:load', function() {
        var body, compiled;
        body = angular.element('body');
        compiled = $compile(body.html())($rootScope);
        return body.html(compiled);
    });
}]);

// api factory
app.factory("Api", ['$http', function($http) {

    var base = '/api/v1';
    var object = {};

    object.index = function(model) {
        return $http.get(base + '/' + model);
    };

    object.show = function(model, object) {
        return $http.get(base + '/' + model + '/' + object.id);
    };

    object.create = function(model, object) {
        return $http({
            method: "POST",
            url: base + '/' + model,
            data: object
        });
    };

    object.update = function(model, object) {
        return $http({
            method: "PATCH",
            url: base + '/' + model + '/' + object.id + '',
            data: object
        });
    };

    object.destroy = function(model, object) {
        return $http({
            method: "DELETE",
            url: base + '/' + model + '/' + object.id + '',
            data: object
        });
    };

    return object;

}]);

// iframe factory
app.factory("Iframe", function() {

    var iframe = document.getElementById('iframe').contentWindow;
    return function(model, scope) {
        iframe.updatedata(model, scope);
        $("#resume-preview").height(iframe.document.body.offsetHeight);
    };

});

// design iframes factory
app.factory("DesignIframes", function() {

    var rocket = document.getElementById('theme-rocket').contentWindow;
    var ace = document.getElementById('theme-ace').contentWindow;
    var cue = document.getElementById('theme-cue').contentWindow;
    var henry = document.getElementById('theme-henry').contentWindow;
    return function(model, scope) {
        rocket.updatedata(model, scope);
        ace.updatedata(model, scope);
        cue.updatedata(model, scope);
        henry.updatedata(model, scope);
    };

});

// experience form
app.directive('experienceForm', function() {
    return {
        templateUrl: '/assets/forms/experience.html'
    };
});

// education form
app.directive('educationForm', function() {
    return {
        templateUrl: '/assets/forms/education.html'
    };
});

// award form
app.directive('awardForm', function() {
    return {
        templateUrl: '/assets/forms/award.html'
    };
});

// skill form
app.directive('skillForm', function() {
    return {
        templateUrl: '/assets/forms/skill.html'
    };
});

// contact link form
app.directive('contactLinkForm', function() {
    return {
        templateUrl: '/assets/forms/contact_link.html'
    };
});

// resume controller
app.controller("ResumeController", ['$scope', 'Api', function($scope, Api) {
    var model = "resume";
    $scope.resume;

    $scope.load = function(json) {
        $scope.resume = json;
    };

    $scope.togglePrivate = function(resume) {
        $scope.resume.private = !resume.private;
        Api.create("resume/privacy", resume);
    };

    $scope.toggleDropboxSyncing = function(has_dropbox_sync) {
      if (has_dropbox_sync == true) { // currently enabled
        Api.create("settings/syncing/disable").success(function() {
          $scope.has_dropbox_sync = false;
        });
      }
    };

}]);

// theme controller
app.controller("ThemeController", ['$scope', function($scope) {
    $scope.resume;

    $scope.load = function(json) {
        $scope.resume = json;
    };

    window.updatedata = function(model, data) {
        $scope.$apply(function() {

            if (model == "about") {
                $scope.resume.about = data;
            } else if (model == "contact") {
                $scope.resume.contact = data;
            } else if (model == "experiences") {
                $scope.resume.experiences = data;
            } else if (model == "educations") {
                $scope.resume.educations = data;
            } else if (model == "awards") {
                $scope.resume.awards = data;
            } else if (model == "skills") {
                $scope.resume.skills = data;
            } else if (model == "contact_links") {
                $scope.resume.contact.contact_links = data;
            } else if (model == "design") {
                $scope.resume.design = data;
            }
            
        });

    };

}]);

// about controller
app.controller("AboutController", ['$scope', 'Api', 'Iframe', '$http', function($scope, Api, Iframe, $http) {
    var model = "about";
    $scope.about;

    $scope.updateIframe = function() {
        Iframe(model, $scope.about);
    };

    $scope.uploadImage = function() {
        imageDataURI(this);

        function imageDataURI(input) {
            if (input.files && input.files[0]) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    $scope.about.avatar_url = e.target.result;
                    $scope.about.has_avatar = true;
                    $scope.updateIframe();
                    $scope.about.avatar = e.target.result;
                    Api.update(model, $scope.about).success(function(data) {
                        $scope.about = data;
                    });
                }
                reader.readAsDataURL(input.files[0]);
            }
        }
    }

    $scope.load = function(json) {
        $scope.about = json;
    };

    $scope.update = function(about) {
        Api.update(model, about);
    };

    $scope.remove_avatar = function() {
        $scope.about.has_avatar = false;
        $scope.about.avatar_url = null;
        $scope.updateIframe();
        $http.delete("/api/v1/about/remove_avatar").success(function(data) {
            $scope.about = data;
        });
    };
}]);

// experience controller
app.controller("ExperienceController", ['$scope', 'Api', 'Iframe', function($scope, Api, Iframe) {
    var model = "experiences";

    $scope.experience;
    $scope.experiences;
    $scope.show_form = false;
    $scope.form_mode = 'new';

    $scope.updateIframe = function() {
        Iframe(model, $scope.experiences);
    };

    $scope.sortableOptions = {
        axis: 'y',
        handle: '.reorder-icon',
        stop: function() {
            $scope.updateIframe();
            return $.post($('.ui-sortable').data('update-url'), $('.ui-sortable').sortable('serialize'));
        }
      };

    $scope.load = function(json) {
        $scope.experiences = json;
    };

    $scope.form = function(mode, experience) {
        $scope.form_mode = mode;
        $scope.experience = experience;

        // if no month is selected, default to placeholder
        if (!$scope.experience.from_month) {
            $scope.experience.from_month = '';
        }
        if (!$scope.experience.to_month) {
            $scope.experience.to_month = '';
        }

        $scope.show_form = true;
    };

    $scope.dirty = function(form_mode, dirty) {
        if (form_mode == 'new' && dirty == true) {
          $scope.experiences.pending = true;
          $scope.updateIframe();
        };
    };

    $scope.reset = function() {
          $scope.show_form = false;
          $scope.form_mode = 'new';
          $("form").removeClass("invalid-done");
          $scope.experience = {};
          $scope.experience_form.$setPristine();

          $scope.experiences.pending = false;
          $scope.updateIframe();
    };

    $scope.cancel = function() {
        $scope.show_form = false;
    };

    $scope.done = function(valid, mode, experience) {
      if(valid == true) {
        if (mode == "new") {
            Api.create(model, experience).success(function(data) {
                $scope.experiences = data;
                $scope.updateIframe();
            });
        } else if (mode == "edit") {
            Api.update(model, experience).success(function(data) {
                $scope.experiences = data;
                $scope.updateIframe();
            });
        }
        $scope.reset();
      } else {
        $("form").addClass("invalid-done");
      }
    };

    $scope.delete = function(experience) {
        Api.destroy(model, experience).success(function(data) {
            $scope.experiences = data;
            $scope.updateIframe();
        });
    };
}]);

// education controller
app.controller("EducationController", ['$scope', 'Api', 'Iframe', function($scope, Api, Iframe) {
    var model = "educations";

    $scope.education;
    $scope.educations;
    $scope.show_form = false;
    $scope.form_mode = 'new';

    $scope.updateIframe = function() {
        Iframe(model, $scope.educations);
    };

    $scope.sortableOptions = {
        axis: 'y',
        handle: '.reorder-icon',
        stop: function() {
            $scope.updateIframe();
            return $.post($('.ui-sortable').data('update-url'), $('.ui-sortable').sortable('serialize'));
        }
      };

    $scope.load = function(json) {
        $scope.educations = json;
    };

    $scope.form = function(mode, education) {
        $scope.form_mode = mode;
        $scope.education = education;
        $scope.show_form = true;
    };

    $scope.dirty = function(form_mode, dirty) {
        if (form_mode == 'new' && dirty == true) {
          $scope.educations.pending = true;
          $scope.updateIframe();
        };
    };

    $scope.reset = function() {
        $scope.show_form = false;
        $scope.form_mode = 'new';
        $("form").removeClass("invalid-done");
        $scope.education = {};
        $scope.education_form.$setPristine();

        $scope.educations.pending = false;
        $scope.updateIframe();
    };

    $scope.cancel = function() {
        $scope.show_form = false;
    };

    $scope.done = function(valid, mode, education) {
      if(valid == true) {
        if (mode == "new") {
            Api.create(model, education).success(function(data) {
                $scope.educations = data;
                $scope.updateIframe();
            });
        } else if (mode == "edit") {
            Api.update(model, education).success(function(data) {
                $scope.educations = data;
                $scope.updateIframe();
            });
        }
        $scope.reset();
      } else {
        $("form").addClass("invalid-done");
      }
    };

    $scope.delete = function(education) {
        Api.destroy(model, education).success(function(data) {
            $scope.educations = data;
            $scope.updateIframe();
        });
    };
}]);

// award controller
app.controller("AwardsController", ['$scope', 'Api', 'Iframe', function($scope, Api, Iframe) {
    var model = "awards";

    $scope.award;
    $scope.awards;
    $scope.show_form = false;
    $scope.form_mode = 'new';

    $scope.updateIframe = function() {
        Iframe(model, $scope.awards);
    };

    $scope.sortableOptions = {
        axis: 'y',
        handle: '.reorder-icon',
        stop: function() {
            $scope.updateIframe();
            return $.post($('.ui-sortable').data('update-url'), $('.ui-sortable').sortable('serialize'));
        }
      };

    $scope.load = function(json) {
        $scope.awards = json;
    };

    $scope.form = function(mode, award) {
        $scope.form_mode = mode;
        $scope.award = award;

        // if no month is selected, default to placeholder
        if ($scope.award) {
          if (!$scope.award.from_month) {
            $scope.award.from_month = '';
          }
        }

        $scope.show_form = true;
    };

    $scope.dirty = function(form_mode, dirty) {
        if (form_mode == 'new' && dirty == true) {
          $scope.awards.pending = true;
          $scope.updateIframe();
        };
    };

    $scope.reset = function() {
        $scope.show_form = false;
        $scope.form_mode = 'new';
        $("form").removeClass("invalid-done");
        $scope.award = {};
        $scope.award_form.$setPristine();

        $scope.awards.pending = false;
        $scope.updateIframe();
    };

    $scope.cancel = function() {
        $scope.show_form = false;
    };

    $scope.done = function(valid, mode, award) {
      if(valid == true) {
        if (mode == "new") {
            Api.create(model, award).success(function(data) {
                $scope.awards = data;
                $scope.updateIframe();
            });
        } else if (mode == "edit") {
            Api.update(model, award).success(function(data) {
                $scope.awards = data;
                $scope.updateIframe();
            });
        }
        $scope.reset();
      } else {
        $("form").addClass("invalid-done");
      }
    };

    $scope.delete = function(award) {
        Api.destroy(model, award).success(function(data) {
            $scope.awards = data;
            $scope.updateIframe();
        });
    };
}]);

// skills controller
app.controller("SkillsController", ['$scope', 'Api', 'Iframe', function($scope, Api, Iframe) {
    var model = "skills";
    $scope.skills;

    $scope.updateIframe = function() {
        Iframe(model, $scope.skills);
    };

    $scope.sortableOptions = {
        axis: 'y',
        handle: '.reorder-icon',
        stop: function() {
            $scope.updateIframe();
            return $.post($('.ui-sortable').data('update-url'), $('.ui-sortable').sortable('serialize'));
        }
      };

    $scope.load = function(json) {
        $scope.skills = json;
        $scope.push_new('new');
    };

    $scope.save = function(skill) {
        if (skill.mode == "new") {
            Api.create(model, skill).success(function(data) {
                skill.id = data.id;
                skill.mode = "";
            });
        } else {
            Api.update(model, skill);
        }
    };

    $scope.delete = function(skill) {
        Api.destroy(model, skill).success(function(data) {
            $scope.skills = data;
            $scope.push_new('new');
            $scope.updateIframe();
        });
    };

    $scope.push_new = function(mode) {
        if ($scope.skills.length < 12) {
            $scope.skills.push({
                mode: mode,
                edit_mode: mode
            });
        }
    };

    $scope.push_last = function(last) {
        if (last == true) {
            $scope.push_new('new');
        }
    };

}]);

// contact controller
app.controller("ContactController", ['$scope', 'Api', 'Iframe', function($scope, Api, Iframe) {
    var model = "contact";
    $scope.contact;

    $scope.updateIframe = function() {
        Iframe(model, $scope.contact);
    };

    $scope.load = function(json) {
        $scope.contact = json;
    };

    $scope.update = function(contact) {
        Api.update(model, contact);
    };

}]);

// contact link controller
app.controller("ContactLinkController", ['$scope', 'Api', 'Iframe', function($scope, Api, Iframe) {
    var model = "contact_links";

    $scope.updateIframe = function() {
        Iframe(model, $scope.contact_links);
    };

    $scope.sortableOptions = {
        axis: 'y',
        handle: '.reorder-icon',
        stop: function() {
            $scope.updateIframe();
            return $.post($('.ui-sortable').data('update-url'), $('.ui-sortable').sortable('serialize'));
        }
      };

    $scope.contact_link;
    $scope.contact_links;
    $scope.show_form = false;
    $scope.form_mode = 'new';

    $scope.load = function(json) {
        $scope.contact_links = json;
    };

    $scope.form = function(mode, contact_link) {
        $scope.form_mode = mode;
        $scope.contact_link = contact_link;
        $scope.show_form = true;
    };

    $scope.dirty = function(form_mode, dirty) {
        if (form_mode == 'new' && dirty == true) {
          $scope.contact_links.pending = true;
          $scope.updateIframe();
        };
    };

    $scope.reset = function() {
        $scope.show_form = false;
        $scope.form_mode = 'new';
        $("form").removeClass("invalid-done");
        $scope.contact_link = {};
        $scope.contact_link_form.$setPristine();

        $scope.contact_links.pending = false;
        $scope.updateIframe();
    };

    $scope.cancel = function() {
        $scope.show_form = false;
    };

    $scope.done = function(valid, mode, contact_link) {
      if(valid == true) {
        if (mode == "new") {
            Api.create(model, contact_link).success(function(data) {
                $scope.contact_links = data;
                $scope.updateIframe();
            });
        } else if (mode == "edit") {
            Api.update(model, contact_link).success(function(data) {
                $scope.contact_links = data;
                $scope.updateIframe();
            });
        }
        $scope.reset();
      } else {
        $("form").addClass("invalid-done");
      }
    };

    $scope.delete = function(contact_link) {
        Api.destroy(model, contact_link).success(function(data) {
            $scope.contact_links = data;
            $scope.updateIframe();
        });
    };
}]);

// design controller
app.controller("DesignController", ['$scope', 'Api', 'DesignIframes', '$http', function($scope, Api, DesignIframes, $http) {
    var model = "design";
    $scope.design;
    $scope.resume;

    $scope.updateIframe = function() {
        DesignIframes(model, $scope.design);
    };

    $scope.uploadImage = function() {
        imageDataURI(this);

        function imageDataURI(input) {
            if (input.files && input.files[0]) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    $scope.design.cover_url = e.target.result;
                    $scope.design.has_cover = true;
                    $scope.updateIframe();
                    $scope.design.cover = e.target.result;
                    Api.update(model, $scope.design).success(function(data) {
                        $scope.design = data;
                    });
                }
                reader.readAsDataURL(input.files[0]);
            }
        }
    }

    $scope.load = function(json) {
        $scope.design = json;
    };

    $scope.setTheme = function(theme) {
        $scope.design.theme = theme;
    };

    $scope.setColor = function(color) {
        $scope.design.color = color;
    };

    $scope.setFont = function(font) {
        $scope.design.font = font;
    };

    $scope.setSpacing = function(spacing) {
        $scope.design.spacing = spacing;
    };

    $scope.updateTheme = function(design) {
        Api.update(model, design).success(function(data) {
            $scope.design.hex = data.hex;
            $scope.design.colors = data.colors;
            $scope.design.fonts = data.fonts;
            $scope.design.spacings = data.spacings;
            $scope.design.font_name = data.font_name;
            $scope.design.theme_name = data.theme_name;
            $scope.updateIframe();
        });
        $scope.design = design;
        $scope.updateIframe();
    };

    $scope.updateColor = function(design) {
        Api.update(model, design).success(function(data) {
            $scope.design.hex = data.hex;
            $scope.updateIframe();
        });
    };

    $scope.toggleDark = function(design) {
        $scope.design.dark = !design.dark;
        Api.update(model, design).success(function(data) {
            $scope.design = data;
            $scope.updateIframe();
        });
    };

}]);

// settings controller
app.controller("SettingsController", ['$scope', 'Api', function($scope, Api, Iframe) {
    var model = "settings";
    $scope.settings;

    $scope.load = function(json) {
        $scope.settings = json;
    };

    $scope.update = function(settings) {
        Api.update(model, settings);
    };

    $scope.done = function(valid, settings) {
      if(valid == true) {
          Api.update(model, settings).success(function() {
            $scope.settings_form.$setPristine();
          });
      } else {
        $("form").addClass("invalid-done");
      }
    };

    $scope.check_username = function(username) {
        Api.index("settings/check_username?username=" + username + "").success(function(data) {
          if (data == "false") {
            $scope.settings_form.username.$setValidity('taken', false);
          } else {
            $scope.settings_form.username.$setValidity('taken', true);
          }
        });
    };

    $scope.check_email = function(email) {
        Api.index("settings/check_email?email=" + email + "").success(function(data) {
          if (data == "false") {
            $scope.settings_form.email.$setValidity('taken', false);
          } else {
            $scope.settings_form.email.$setValidity('taken', true);
          }
        });
    };

}]);

// settings controller
app.controller("BillingController", ['$scope', 'Api', function($scope, Api, Iframe) {
    var model = "settings/billing";
    $scope.billing;

    $scope.update = function(billing) {
        Api.create(model, billing);
    };

    $scope.done = function($event, valid, billing) {
      $event.preventDefault();
      if(valid == true) {
          Api.create(model, billing);
      } else {
        $("form").addClass("invalid-done");
      }
    };

}]);

// settings controller
app.controller("RegistrationController", ['$scope', 'Api', '$http', function($scope, Api, $http) {

    $scope.cardBrand;
    $scope.cardType = function(first_number) {
      if(first_number == 4) {
        $scope.cardBrand = 'visa';
      } else if(first_number == 5) {
        $scope.cardBrand = 'mastercard';
      } else if(first_number == 3) {
        $scope.cardBrand = 'amex';
      } else if(first_number == 6) {
        $scope.cardBrand = 'discover';
      } else {
        $scope.cardBrand = '';
      }
    }

    $scope.next = function(valid) {
      if (valid == true) {
        $("#one").hide();
        $("#two").show();
      };
    }

    $scope.check_username = function(username) {
        $http.get("/resumes/check_username?username=" + username + "").success(function(data) {
          if (data == "false") {
            $scope.registration_form.username.$setValidity('taken', false);
          } else {
            $scope.registration_form.username.$setValidity('taken', true);
          }
        });
    };

    $scope.check_email = function(email) {
        $http.get("/resumes/check_email?email=" + email + "").success(function(data) {
          if (data == "false") {
            $scope.registration_form.email.$setValidity('taken', false);
          } else {
            $scope.registration_form.email.$setValidity('taken', true);
          }
        });
    };

}]);

app.directive('autoSaveForm', function($timeout) {

    return {
        require: ['^form'],
        link: function($scope, $element, $attrs, $ctrls) {

            var $formCtrl = $ctrls[0];
            var savePromise = null;
            var expression = $attrs.autoSaveForm || 'true';

            $scope.$watch(function() {

                if ($formCtrl.$valid && $formCtrl.$dirty) {

                    if (savePromise) {
                        $timeout.cancel(savePromise);
                    }

                    savePromise = $timeout(function() {

                        savePromise = null;

                        // Still valid?

                        if ($formCtrl.$valid) {

                            if ($scope.$eval(expression) !== false) {
                                //console.log('Form data persisted -- setting prestine flag');
                                $formCtrl.$setPristine();
                            }

                        }

                    }, 500);
                }

            });
        }
    };

});

// popup alert confirmation
app.directive('ngConfirmClick', [
    function() {
        return {
            priority: -1,
            restrict: 'A',
            link: function(scope, element, attrs) {
                element.bind('click', function(e) {
                    var message = attrs.ngConfirmClick;
                    if (message && !confirm(message)) {
                        e.stopImmediatePropagation();
                        e.preventDefault();
                    }
                });
            }
        }
    }
]);

// image change event
app.directive('customOnChange', function() {
    'use strict';

    return {
        restrict: "A",
        link: function(scope, element, attrs) {
            var onChangeFunc = element.scope()[attrs.customOnChange];
            element.bind('change', onChangeFunc);
        }
    };
});

// pending form
app.directive('pendingForm', function() {
    return {
        require: ['^form'],
        link: function($scope, $element, $attrs, $ctrls) {

            var $formCtrl = $ctrls[0];
            var expression = $attrs.pendingForm || 'true';

            $scope.$watch(function() {

                if ($formCtrl.$dirty) {
                    $scope.dirty($scope.form_mode, $formCtrl.$dirty);
                }

            });
        }
    };
});

// confirm exit popup
app.directive('confirmOnExit', function() {
    return {
        link: function($scope, elem, attrs) {
            window.onbeforeunload = function(){
                if ($scope.experience_form.$dirty) {
                    return "The form is dirty, do you want to stay on the page?";
                }
            }
            $scope.$on('$locationChangeStart', function(event, next, current) {
                if ($scope.experience_form.$dirty) {
                    if(!confirm("The form is dirty, do you want to stay on the page?")) {
                        event.preventDefault();
                    }
                }
            });
        }
    };
});

app.filter('tel', function () {
    return function (tel) {
        if (!tel) { return ''; }

        var value = tel.toString().trim().replace(/^\+/, '');

        if (value.match(/[^0-9]/)) {
            return tel;
        }

        var country, city, number;

        switch (value.length) {
            case 10: // +1PPP####### -> C (PPP) ###-####
                country = 1;
                city = value.slice(0, 3);
                number = value.slice(3);
                break;

            case 11: // +CPPP####### -> CCC (PP) ###-####
                country = value[0];
                city = value.slice(1, 4);
                number = value.slice(4);
                break;

            case 12: // +CCCPP####### -> CCC (PP) ###-####
                country = value.slice(0, 3);
                city = value.slice(3, 5);
                number = value.slice(5);
                break;

            default:
                return tel;
        }

        if (country == 1) {
            country = "";
        }

        number = number.slice(0, 3) + '-' + number.slice(3);

        return (country + " (" + city + ") " + number).trim();
    };
});

app.filter('first_name', function () {
    return function (name) {
        if (!name) { return ''; }

        var value = name.toString().split(' ')[ 0 ];

        return value;
    };
});
app.filter('last_name', function () {
    return function (name) {
        if (!name) { return ''; }

        var value = name.toString().split(' ');
        value[0] = "";

        return value.join(" ").toString();
    };
});
app.filter('rawHTML', function() {
  return function(text){
        text = String(text).trim();
        return (text.length > 0 ? '<p>' + text.replace(/[\r\n]+/g, '</p><p>') + '</p>' : null);
    }
});
app.filter('rawArray', function() {
  return function(text) {
      if(text) {
        text = text.split('\n')
      }
      return text;
  };
});
