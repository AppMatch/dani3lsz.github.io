//
//  create fluid watch app layout
//


(function(){

  var speed = 400;
  var stage = $('.js-base');
  var crown = $('.js-crown');
  var app = $('.js-app');
  var icons = stage.children();

  var sW = stage.width(); // width
  var sH = stage.height(); // height

  var iD = icons.width(); // icon diameter
  var iDm = iD + 6; // + padding between icons

  var n = 6; // number of points of the polygon we want for the layout
  var sumInnerAngles = (n - 2) * Math.PI; // sum of all inner angles in polygon in radians
  var halfAngle = sumInnerAngles / n / 2; // half of an inner angle
  var exteriorAngle = Math.PI - sumInnerAngles / n;

  // distance between the center of circles on a circle
  var d1 = n < 6 ? Math.round(Math.sqrt(iDm * iDm * 2 - 2 * iDm * iDm * Math.cos(Math.PI * 2 / n))) : iDm;

  // distance between the center of circles on the different layers
  var d2 = n > 6 ? Math.round(iDm * Math.sin(halfAngle) /  Math.sin(Math.PI - halfAngle * 2)) : iDm;

  var points;

  function createGrid() {
    points = [];
    points.push([0,0,1,0,0,1,0,0,1,0,0]); // x, y, scale1, x mod1, y mod1, scale2, x mod2, y mod2, scale3, x mod3, y mod3

    var m = 0, r = 0; // helpers for the loop

    for (var i=1; i<icons.length; i++) {
      var x, y, newXY;

      // statement is true after every full rotate
      if (i % (n * m + 1) == 0) {
        r += 1; // number of serial
        m += r; // increase the length of the next rotate

        // new first coordinate after a full rotate
        newXY = transformCoordinates(0,0,d2 * r,Math.PI * 2 - halfAngle)
      } else {
        // coordinates of previous point
        x = points[i - 1][0];
        y = points[i - 1][1];

        var moveAngle = exteriorAngle * Math.ceil((i - ((m - r) * n) - 1) / r);

        // move coordinates to get new point
        newXY = transformCoordinates(x,y,d1,moveAngle);
      }

      points.push(newXY);
    }
  }

  var moving = false;

  icons.eq(0).on('click', function(){
    if (!moving) {
      centerIcons();
      zoomIcons(6,speed);
      zoomApp(6,speed)
    }
  });

  //Init touch swipe
  crown.swipe({
    swipeStatus: controlZoom,
    threshold: 1,
    allowPageScroll: 'none',
    triggerOnTouchLeave: true
  });

  var zf = 1;
  var zh = true;

  // control zoom
  function controlZoom(event,phase,direction,distance,fingers) {
    if (phase == 'start') {
      centerIcons();
      zoomApp(0,speed)
    } else if (phase == 'move' && direction == 'down' && zh) {
      zf = Math.min(1 + distance / 6,6);
      zoomIcons(zf,100);
    } else if (phase == 'end') {
      if (zf >= 2 && direction == 'down') {
        zf = 6;
        zh = false;
        zoomIcons(zf,speed);
        zoomApp(zf,speed)
      } else {
        zf = 1;
        zh = true;
        zoomIcons(zf,speed);
        zoomApp(0,speed)
      }
    }
  }

  function centerIcons() {
    zh = true;
    createGrid();
    moveIconCoordinates(sW / 2,sH / 2);
    scaleIcons();
    applyCss(speed)
  }

  //Init touch swipe
  stage.swipe({
    swipeStatus: moveIcons,
    threshold: 1,
    allowPageScroll: 'none',
    triggerOnTouchLeave: true
  });

  var clientX, clientY;

  // moving icons
  function moveIcons(event,phase,direction,distance,fingers) {
    if (phase == 'start') {
      clientX = event.pageX;
      clientY = event.pageY;
    } else if (phase == 'move') {
      moving = true;

      var clientXn = event.pageX;
      var clientYn = event.pageY;

      var xMove = clientXn - clientX;
      var yMove = clientYn - clientY;

      clientX = clientXn;
      clientY = clientYn;

      moveIconCoordinates(xMove,yMove);
      scaleIcons();
      applyCss()
    } else if (phase == 'end') {
      setTimeout(function(){
        moving = false;
      },10)
    }
  }

  // move coordinates with given distance in given angle
  function transformCoordinates(x,y,d,a) {
    var
      x1 = Math.round((x + d * Math.cos(a)) * 100) / 100,
      y1 = Math.round((y + d * Math.sin(a)) * 100) / 100;

    return [x1,y1,1,0,0,1,0,0,1,0,0]
  }

  // moving all icon's coordinates
  function moveIconCoordinates(distanceX,distanceY) {
    for (var i = 0; i < points.length; i++) {
      points[i][0] += distanceX;
      points[i][1] += distanceY;
    }
  }

  // moving all icon's coordinates
  function scaleIcons(distanceX,distanceY) {
    for (var i = 0; i < points.length; i++) {
      var x = points[i][0];
      var y = points[i][1];

      var xdc = Math.abs(sW / 2 - x);
      var ydc = Math.abs(sH / 2 - y);

      var dc = xdc != 0 && ydc != 0 ? Math.sqrt(xdc * xdc + ydc * ydc) : Math.max(xdc,ydc);

      var z1 = Math.max(Math.min(1 - Math.round(((dc / iDm * 2) - 1) * 0.1 * 100) / 100, 1),0);

      var aMod = z1 != 1 ? Math.acos(xdc / dc) : 0;

      if (sW / 2 - x > 0) {
        if (sH / 2 - y < 0) {
          aMod = 2 * Math.PI - aMod;
        }
      } else {
        if (sH / 2 - y > 0) {
          aMod = Math.PI - aMod;
        } else {
          aMod = Math.PI + aMod;
        }
      }

      var mod1 = transformCoordinates(x,y,(iD - Math.round(iD * z1)) / 2 * dc / iDm,aMod);

      points[i][2] = z1;
      points[i][3] = mod1[0] - x;
      points[i][4] = mod1[1] - y;

      var z2t = 1;

      var xds = Math.min(sW - (x + points[i][3] + iD * z1 / 2), x + points[i][3] - iD * z1 / 2);
      var yds = Math.min(sH - (y + points[i][4] + iD * z1 / 2), y + points[i][4] - iD * z1 / 2);

      if (xds < 0 || yds < 0) {
        z2t = Math.round((iD * z1 - Math.abs(Math.min(xds,yds))) / (iD * z1) * 1000) / 1000;

        var z2 = z1 * z2t >= 0.1 ? z2t : 0.1 / z1;

        var mod2 = transformCoordinates(x + points[i][3],y + points[i][4],(iD * z1 - iD * z1 * z2) / 2 + 1,aMod);

        points[i][5] = z2;
        points[i][6] = mod2[0] - x - points[i][3];
        points[i][7] = mod2[1] - y - points[i][4];
      } else {
        points[i][5] = 1;
        points[i][6] = 0;
        points[i][7] = 0;
      }
    }
  }

  // zoom in
  function zoomIcons(scale,duration) {
    for (var i = 0; i < points.length; i++) {
      var x = points[i][0] + points[i][3] + points[i][6];
      var y = points[i][1] + points[i][4] + points[i][7];

      points[i][8] = scale;
      points[i][9] = (x - sW / 2) * scale - (x - sW / 2);
      points[i][10] = (y - sH / 2) * scale - (y - sH / 2);
    }

    applyCss(duration);
    zoomApp(scale,duration)
  }

  // zoom app
  function zoomApp(scale,duration) {
    var appScale = scale <= 2 ? scale / (14 - scale * 4) : scale / 6;

    app.css({
      "-webkit-transition-duration": (duration / 1000).toFixed(1) + "s",
              "transition-duration": (duration / 1000).toFixed(1) + "s",
      "-webkit-transform": "scale("+ appScale +")",
              "transform": "scale("+ appScale +")"
    });
  }

  // set the css of the icons based on current coordinates
  function applyCss(duration) {
    if (!duration) {
      duration = 0;
    }

    for (var i = 0; i < points.length; i++) {
      var x = points[i][0] + points[i][3] + points[i][6] + points[i][9];
      var y = points[i][1] + points[i][4] + points[i][7] + points[i][10];
      var z = points[i][2] * points[i][5] * points[i][8];

      icons.eq(i).css({
        "-webkit-transition-duration": (duration / 1000).toFixed(1) + "s",
                "transition-duration": (duration / 1000).toFixed(1) + "s",
        "-webkit-transform": "translate3d(" + x + "px," + y + "px," + "0) scale("+ z +")",
                "transform": "translate3d(" + x + "px," + y + "px," + "0) scale("+ z +")"
      })
    }
  }

  createGrid();
  moveIconCoordinates(sW / 2,sH / 2);
  scaleIcons();
  applyCss();

})();
