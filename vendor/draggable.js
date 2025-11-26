(function(){

  angular.module('drag', [])
  .directive('draggable', function($document){
    return function(scope, element, attr) {
      var startX = 0,
      startY = 0,
      x = 0,
      y = 0; 
      var container = null; 
      container = attr.$$element.parent();
      
      element.css({
        position: 'relative',
        cursor: 'pointer'
      });

      element.on('mousedown', function(event){
        // Prevent default dragging of selected content
        event.preventDefault();
        startX = event.screenX - x;
        startY = event.screenY - y;
        $document.on('mousemove', mousemove);
        $document.on('mouseup', mouseup);

        // console.log(container);

      });

      element.on('touchstart', function(event){

          if (event.targetTouches.length == 1){
            var touch = event.targetTouches[0];

            console.log("CONTAINER");
            console.log(container);

            startX = container[0].clientLeft;
            startY = container[0].clientTop;

            console.log("START X: " + startX);
            console.log("START Y: " + startY);

          }

      });

      element.on('touchmove', function(event){

        event.preventDefault();

        console.log("TOUCH EVENT");
        console.log(event);

        // If there's exactly one finger inside this element
        if (event.targetTouches.length == 1) {
          var touch = event.targetTouches[0];
          // Place element where the finger is
          console.log("TOUCHED");

          var x = touch.pageX - startX;
          var y = touch.pageY - startY;

          if( x < 1 )
          {
            x = 1;
          }

          if( y < -41 )
          {
            y = -41;
          }

          console.log("x: " + x + " y: " + y)
          container.css({
            top: y + 'px',
            left: x + 'px'
          });

          // obj.style.left = touch.pageX + 'px';
          // obj.style.top = touch.pageY + 'px';
        }
      });

      scope.$on("draggable::reset", function(){
        container.css({
          top: window.pageYOffset || document.documentElement.scrollTop + 'px',
          left: window.pageXOffset || document.documentElement.scrollLeft + 'px'
        });
      });

      function mousemove(event) {
        y = event.screenY - startY;
        x = event.screenX - startX;

        if( x < 1 )
        {
          x = 1;
        }

        if( y < -41 )
        {
          y = -41;
        }

        console.log("x: " + x + " y: " + y)
        container.css({
          top: y + 'px',
          left: x + 'px'
        });
      }

      function mouseup() {
        $document.unbind('mousemove', mousemove);
        $document.unbind('mouseup', mouseup);
      }
    }
  });

})();