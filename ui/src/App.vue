<template>
  <div id="app">   
    <div v-if="limite != 0" class="alert alert-danger" role="alert">
      <p><span class="glyphicon glyphicon-remove" aria-hidden="true"></span> <span v-html="this.lb_19"></span> <span v-html="this.limite"></span><span v-html="this.lb_20"></span></p>
    </div>
    <div>
        <div v-if="state=='stamped'">
          <div v-for="(value, index) in allFiles" :key="index">
            <div class="success-verify alert alert-success" role="alert">
              <p><span class="glyphicon glyphicon-ok" aria-hidden="true"></span> <span v-html="lb_00"></span> <b>{{value.fileName}}</b> <span v-html="lb_01"></span></p>
              <div class="copiar">
              <label class="font_small" v-html="lb_16" :for="'id_'+index"></label>
              <div class="input-group">
                <input class="form-control input-sm" type="textfield" readonly :value="getHashURL(index)" :id="'id_'+index" >
                <span class="input-group-btn">
                  <button class="btn btn-default btn-sm" v-on:click="copiarURL(index)"><span class="glyphicon glyphicon-copy text-success" aria-hidden="true"></span> <span v-html="lb_15"></span></button>
                </span>
              </div>
            </div>
            </div>
          </div>
        </div>
        <div v-if="state=='failed-stamp'" class="fail-stamp alert alert-danger" role="alert">
          <p><span class="glyphicon glyphicon-remove" aria-hidden="true"></span> <span v-html="this.lb_02"></span> <b>{{archivo}}</b>
          </p>
        </div>        
        <div v-if="state=='verify-completed'">
          <div v-for="(value, index) in allFiles" :key="index">
            <div v-if="value.verified" class="success-verify alert alert-success" role="alert">
              <p><span class="glyphicon glyphicon-ok" aria-hidden="true"></span> <span v-html="lb_00"></span> <b>{{value.fileName}}</b> <span v-html="lb_03"></span></p>
              <ul>
                  <li v-for="(stamp, subindex) in value.stamps" :key="subindex">
                      <span class="hash"><b>{{ stamp.whostamped }}</b></span> <span v-html="lb_04"></span> <b>{{ stamp.blocknumber }}</b> {{ convertTime(stamp.blocktimestamp)  }}
                      
                      <br>
                      <div class="copiar">                    
                        <div v-on:click="reactionPanel()">
                            <button class="btn btn-default btn-sm" v-on:click="copiar('recibo_'+index+'_'+subindex)"><span class="glyphicon glyphicon-copy text-success" aria-hidden="true"></span> <span v-html="lb_15+' recibo '"></span></button>
                            <button class="btn btn-default btn-sm" v-on:click="download(value.fileName+'_recibo.txt', copiar_txt('recibo_'+index+'_'+subindex))"><span class="glyphicon glyphicon-download text-success" aria-hidden="true"></span> <span v-html="' Descargar'"></span></button>
                            <button class="btn btn-default btn-sm accordion"><span class="glyphicon glyphicon-zoom-in text-success" aria-hidden="true"></span> Ver recibo</button>
                            <div class="panel">
                              <textarea class="panelTextArea" readonly :id="'recibo_'+index+'_'+subindex" v-html=" armarRecibo(stamp) "></textarea>
                            </div>
                        </div>
                      </div>

                  </li>
              </ul>
              <div class="copiar">
              <label class="font_small" v-html="lb_16" :for="'id_'+index"></label>
              <div class="input-group">
                <input class="form-control input-sm" type="textfield" readonly :value="getHashURL(index)" :id="'id_'+index" >
                <span class="input-group-btn">
                  <button class="btn btn-default btn-sm" v-on:click="copiarURL(index)"><span class="glyphicon glyphicon-copy text-success" aria-hidden="true"></span> <span v-html="lb_15"></span></button>
                </span>
              </div>
            </div>

            </div>
            <div v-else class="fail-verify alert alert-danger" role="alert" >
              <p><span class="glyphicon glyphicon-remove" aria-hidden="true"></span> <span v-html="lb_05"></span> <b>{{value.fileName}}</b></p>
            </div>
          </div>
        </div>

        <div v-if="state=='verified'" class="success-verify alert alert-success" role="alert">
          <p><span class="glyphicon glyphicon-ok" aria-hidden="true"></span> <span v-html="this.lb_00"></span> <b>{{archivo}}</b> <span v-html="this.lb_03"></span></p>
          <ul>
              <li v-for="(stamp, index) in stamps" :key="index">
                  <span class="hash"><b>{{ stamp.whostamped }}</b></span> <span v-html="lb_04"></span> <b>{{ stamp.blocknumber }}</b> {{ convertTime(stamp.blocktimestamp)  }}
                  <br>

                  <div class="copiar">                    
                    <div v-on:click="reactionPanel()">
                        <button class="btn btn-default btn-sm" v-on:click="copiar('recibo'+index)"><span class="glyphicon glyphicon-copy text-success" aria-hidden="true"></span> <span v-html="lb_15+' recibo '"></span></button>
                        <button class="btn btn-default btn-sm" v-on:click="download(stamp.whostamped+'_recibo.txt', copiar_txt('recibo'+index))"><span class="glyphicon glyphicon-download text-success" aria-hidden="true"></span> <span v-html="' Descargar'"></span></button>
                        <button class="btn btn-default btn-sm accordion"><span class="glyphicon glyphicon-zoom-in text-success" aria-hidden="true"></span> Ver recibo</button>
                        <div class="panel">
                          <textarea class="panelTextArea" readonly :id="'recibo'+ index" v-html=" armarRecibo(stamp) "></textarea>
                        </div>
                    </div>
                  </div>
                  
              </li>
          </ul>

          
          <div class="copiar">
            <label class="font_small" v-html="lb_16" for="id_single"></label>
            <div class="input-group">
              <input class="form-control input-sm" type="textfield" readonly :value="getHashURL(null)" id="id_single">
              <span class="input-group-btn">
                <button class="btn btn-default btn-sm" v-on:click="copiarURL(null)"><span class="glyphicon glyphicon-copy text-success" aria-hidden="true"></span> <span v-html="lb_15"></span></button>
              </span>
            </div>
          </div>



        </div>

        <div v-if="state=='failed-verification'" class="fail-verify alert alert-danger">
          <p><span class="glyphicon glyphicon-remove" aria-hidden="true"></span> <span v-html="this.lb_05"></span> <b>{{archivo}}</b></p>
        </div>
        <div v-if="state!='visible-drop'">
          <button v-on:click="continuar()" class="btn btn-primary btn-pill btn-lg" v-html="this.lb_06"></button>
        </div>
      </div>
      <DropFile
        ref="dropFile"
        :apiurl="apiurl"
        :lb_07="lb_07"
        :lb_08="lb_08"
        :lb_09="lb_09"
        :lb_10="lb_10"
        :lb_11="lb_11"
        :lb_12="lb_12"
        :lb_13="lb_13"
        :lb_14="lb_14"
        :lb_17="lb_17"
        :lb_18="lb_18"
        :lb_19="lb_19"
        :lb_20="lb_20"
        v-if="state == 'visible-drop'"
        v-on:stamp="onStamp" 
        v-on:failed-stamp="onFailedStamp()" 
        v-on:limit-surpassed="onLimitSurpassed" 
        v-on:verify="onVerify" 
        v-on:verify-completed="onVerifyCompleted" 
        v-on:failed-verify="onFailedVerify()" 
        v-on:nombreArchivo="onFilename"
      />
  </div>
</template>

<script>
 import DropFile from './components/DropFile.vue'
 
 export default {
   name: 'app',
   props: ['apiurl',
           'lb_00',
           'lb_01',
           'lb_02',
           'lb_03',
           'lb_04',
           'lb_05',
           'lb_06',
           'lb_07',
           'lb_08',
           'lb_09',
           'lb_10',
           'lb_11',
           'lb_12',
           'lb_13',
           'lb_14',
           'lb_15',
           'lb_16',
           'lb_17',
           'lb_18',
           'lb_19',
           'lb_20'
          ],
   computed: {
    hash () {
      return this.$route.params.hash
    }
   },   
   data: function() {
     return {
       state: 'visible-drop', 
       limite: 0,
       archivo: '',
       allFiles: [],
       stamps: []
     }
   },
   methods: {     
     continuar() {
      this.$router.push('/')
      this.$route.params.pathMatch
      this.state = 'visible-drop'
     },
     onVerify(stamps) {
       this.stamps = stamps
       this.state = 'verified'
     },
     onVerifyCompleted(allFiles) {
       this.allFiles = allFiles
       this.state = 'verify-completed'
     },
     onFailedVerify() {
       this.state = 'failed-verification'       
     },
     onStamp(allFiles) {
       this.allFiles = allFiles
       this.state = 'stamped'
     },
     onFailedStamp() {
       this.state = 'failed-stamp'
     },
     onFilename (value) {
      this.archivo = value
    },   
    onLimitSurpassed (value) {
      this.limite = value
    }, 
    
    reactionPanel(){
      var acc = document.getElementsByClassName("accordion");
      var i;

      for (i = 0; i < acc.length; i++) {
        acc[i].addEventListener("click", function() {
          this.classList.toggle("active");
          var panel = this.nextElementSibling;
          if (panel.style.maxHeight) {
            panel.style.maxHeight = null;
            panel.style.background = '#dff0d8';
          } else {
            //panel.style.maxHeight = panel.scrollHeight + "px";
            panel.style.maxHeight = "420px";
            panel.style.background = '#ffffff';
          } 
        });
      }
    },

    download(filename, stamp) {
      var element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(stamp));
      element.setAttribute('download', filename);

      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    },

    armarRecibo(stamp){
      var obj;
      if (stamp.tree){
        obj = { 
          nroBloque: stamp.blocknumber, 
          dateStamp: this.convertTime(stamp.blocktimestamp),
          accountStamp: stamp.whostamped ,
          addressContract: stamp.contract,
          hashStamped: stamp.tree.leave,
          tree: {
            proof: stamp.tree.proof,
            stampedRoot: stamp.tree.stampedroot,
            algo: stamp.tree.algo
          }
        };
      } else {
         obj = { 
          nroBloque: stamp.blocknumber, 
          dateStamp: this.convertTime(stamp.blocktimestamp),
          accountStamp: stamp.whostamped ,
          addressContract: stamp.contract
          }
      }
      return obj;
    },

    getHashURL(index){
      var url;
      //console.log(index);
      if (index == null){
        url = window.location.href;
      }else{
        url = window.location.href+'hash/'+this.allFiles[index].hash;
      }
      return url;
    },
    copiarURL(index){
      if (index == null){
        // this.copiar(window.location.href);
        this.copiar('id_single');
      }else{
        // this.copiar(window.location.href+'hash/'+this.allFiles[index].hash);
        this.copiar('id_'+index);
      }
    },
    copiar(id){
        var copyText = document.getElementById(id);
        copyText.focus();
      /* Select the text field */
        copyText.select();
        copyText.setSelectionRange(0, 99999); /*For mobile devices*/
        /* Copy the text inside the text field */
        document.execCommand("copy");
        //console.log("Copied the text: " + copyText.value);
    },
    copiar_txt(id){
      var copyText = document.getElementById(id);
      return copyText.value;
    },
    convertTime(timestamp){
      var date = new Date(timestamp*1000)
      var options = { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short' };
      date = date.toLocaleDateString('es-AR', options)
      return date
    }
   },
   components: {
     DropFile
   }
}
</script>
