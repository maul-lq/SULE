const client = require("./client.js");

let WorkspaceManager;
try {
  WorkspaceManager = brackets.getModule("view/WorkspaceManager");
} catch (e) {
  WorkspaceManager = null;
}

class UserPanel {
  constructor() {
    this.id = "liveshare.userpanel";
    this.$panel = null;
    this.panelVisible = false;
    this.minimized = sessionStorage.getItem("liveshare.userpanel.minimized") === "true";
    this.maxHeight = 250;
    this.minHeight = 35;
    const storedHeight = parseInt(sessionStorage.getItem("liveshare.userpanel.height"));
    this.savedHeight = (storedHeight && storedHeight > 0 && storedHeight < this.maxHeight) ? storedHeight : 100;
    this.panel = null;
    this._isResizing = false;
    this._startY = 0;
    this._startHeight = 0;
  }

  show() {
    if (!this.$panel) {
      this.$panel = $(`
        <div id="liveshare-user-panel" style="
          display: flex;
          flex-direction: column;
          height: 100%;
          max-height: 250px;
          overflow: hidden;
          background: rgba(74, 76, 78);
          color: #ccc;
          font-size: 11px;
          border-left: 1px solid rgba(58, 63, 65);
        ">
          <!-- Header (Always visible) -->
          <div id="ls-panel-header" style="
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(58, 63, 65);
            padding: 5px 10px;
            border-bottom: 1px solid rgba(74, 76, 78);
            user-select: none;
            cursor: pointer;
          ">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-weight: 600; font-size: 10px; color: #ccc; text-transform: uppercase; letter-spacing: 1.2px;">LiveShare</span>
              <span id="ls-ping-indicator" style="
                font-size: 10px;
                color: #666;
                margin-left: 4px;
              ">—</span>
            </div>
            <div id="ls-toggle-btn" style="
              width: 18px;
              height: 18px;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              font-size: 14px;
              color: #999;
              transition: color 0.2s;
            " onmouseover="this.style.color='#fff'" onmouseout="this.style.color='#999'">−</div>
          </div>

          <!-- Content (Minimizable) -->
          <div id="ls-panel-content" style="flex: 1; overflow-y: auto; padding: 2px 0;">
            <div id="ls-user-list" style="display: flex; flex-direction: column;"></div>
          </div>
        </div>
      `);

      const initialHeight = this.minimized ? 35 : Math.min(this.savedHeight, this.maxHeight);
      this.panel = app.panelManager.createBottomPanel(this.id, this.$panel, initialHeight);
      
      this.$panel.find("#ls-toggle-btn").on("click", () => {
        this.toggleMinimize();
      });

      this.$panel.find("#ls-panel-header").on("dblclick", () => {
        this.toggleMinimize();
      });

      if (this.minimized) {
        this.$panel.find("#ls-panel-content").hide();
        this.$panel.find("#ls-toggle-btn").text("+");
      }

      this.panel.show();
    } else {
      const $content = this.$panel.find("#ls-panel-content");
      if (this.minimized) {
        $content.hide();
      } else {
        $content.show();
      }
    }

    this.panel.show();
    this.panelVisible = true;
    this.render();

    if (this.panel && typeof this.panel.setHeight === "function") {
      const safeHeight = Math.min(Math.max(this.savedHeight, 35), this.maxHeight);
      const targetHeight = this.minimized ? 35 : safeHeight;
      this.panel.setHeight(targetHeight);
    }

    client.onUserUpdate(() => {
      console.log("[LS] User panel: user update callback fired");
      if (this.panelVisible) this.render();
    });

    client.onLatencyUpdate((latency) => {
      const $indicator = this.$panel.find("#ls-ping-indicator");
      if ($indicator.length) {
        let color;
        if (latency < 0) {
          color = '#666';
        } else if (latency < 50) {
          color = '#2ecc71';
        } else if (latency < 150) {
          color = '#f1c40f';
        } else {
          color = '#e74c3c';
        }
        $indicator.text(latency < 0 ? '—' : latency + 'ms').css('color', color);
      }
    });
  }

  toggleMinimize() {
    this.minimized = !this.minimized;
    const $content = this.$panel.find("#ls-panel-content");
    const $btn = this.$panel.find("#ls-toggle-btn");

    sessionStorage.setItem("liveshare.userpanel.minimized", this.minimized);

    const targetHeight = this.minimized ? 28 : Math.min(Math.max(this.savedHeight, 35), this.maxHeight);

    if (this.minimized) {
      const currentHeight = this.$panel.height();
      if (currentHeight > 35 && currentHeight < this.maxHeight) {
        this.savedHeight = currentHeight;
        sessionStorage.setItem("liveshare.userpanel.height", this.savedHeight);
      }
    }

    this.$panel.css("height", targetHeight + "px");
    $content.toggle(!this.minimized);
    $btn.text(this.minimized ? "+" : "−");

    if (this.panel && typeof this.panel.setHeight === "function") {
      this.panel.setHeight(targetHeight);
    } else if (this.panel && typeof this.panel.resize === "function") {
      this.panel.resize();
    }

    if (app.panelManager) {
      if (app.panelManager.triggerEditorResize) {
        app.panelManager.triggerEditorResize();
      } else if (app.panelManager._notifyLayoutChange) {
        app.panelManager._notifyLayoutChange();
      }
    }
  }

  hide() {
    if (this.panel) {
      this.panel.hide();
    }
    this.panelVisible = false;
  }

  render() {
    if (!this.$panel) return;

    const users = client.getUsers();
    let followingId = client.getFollowingUserId();

    if (followingId && !users[followingId]) {
      client.setFollowingUserId(null);
      followingId = null;
    }

    const $list = this.$panel.find("#ls-user-list");
    $list.empty();

    const ids = Object.keys(users);
    let displayIds = ids;

    const myId = client.getSocketId();
    if (myId) {
      displayIds = ids.filter(id => id !== myId);
    }

    if (displayIds.length === 0) {
      $list.append('<div style="font-style: italic; opacity: 0.5; padding: 8px; text-align: center; font-size: 11px; color: #999;">Waiting for peers...</div>');
      return;
    }

    displayIds.forEach((id) => {
      const isFollowing = followingId === id;
      const $userItem = $(`
        <div class="ls-user-item" style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 12px;
          margin: 0;
          cursor: pointer;
          transition: background 0.1s ease;
          background: ${isFollowing ? 'rgba(58, 63, 65)' : 'transparent'};
          color: #ccc;
        ">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 5px; height: 5px; border-radius: 50%; background: ${isFollowing ? '#fff' : '#999'};"></div>
            <span style="font-size: 11px; font-weight: ${isFollowing ? '700' : '400'}; line-height: 1;">${users[id]}</span>
          </div>
          ${isFollowing
            ? '<span style="font-size: 8px; color: #fff; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Following</span>'
            : ''}
        </div>
      `);

      $userItem.hover(
        function() { if (!isFollowing) $(this).css({'background': 'rgba(58, 63,65,0.5)', 'color': '#fff'}); },
        function() { if (!isFollowing) $(this).css({'background': 'transparent', 'color': '#ccc'}); }
      );

      $userItem.on("click", (e) => {
        e.preventDefault();
        if (isFollowing) {
          client.setFollowingUserId(null);
        } else {
          client.setFollowingUserId(id);
        }
        this.render();
      });

      $list.append($userItem);
    });
  }
}

module.exports = UserPanel;
