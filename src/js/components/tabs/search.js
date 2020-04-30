Vue.component('llct-search', {
  template: `<div class="llct-tab" id="tab3">
    <div class="search-info">
      <llct-searchbox placeholder="여기에 검색할 텍스트 입력" :extraText="waitEnter && waitEnter + '개의 검색 결과가 있지만, 성능을 위해 표시하지 않았습니다. 엔터를 눌러 확인할 수 있습니다.' || ''" :enter="goSearch" :type="(v) => goSearch(v, true)"></llct-searchbox>
      <div class="search-music-cards" v-if="this.searchedData && this.searchedData.length">
        <transition-group name="llct-card" appear @before-enter="beforeEnter" @after-enter="afterEnter" tag="span">
          <llct-music-card placeholder="round" v-for="(card, index) in this.searchedData" v-bind:key="'card_search_' + card.id" :title="card.title" :artist="getArtist(card.id, card.artist)" :cover_url="getCoverURL(card.id)" :id="card.id"></llct-music-card>
        </transition-group>
      </div>
      <div class="search-music-nores" v-else>
        <div class="inner">
          <div class="big-icon">
            <div class="bg"></div>
            <span class="material-icons">{{this.keyword == '' ? 'find_in_page' : 'close'}}</span>
          </div>
          <transition-group name="llct-search-text">
            <h1 :key="'show_' + this.keyword == ''" v-show="this.keyword == ''">검색어를 입력하세요.</h1>
            <h1 :key="'show_' + this.keyword == ''" v-show="this.keyword !== ''">검색 결과가 없습니다.</h1>
          </transition-group>
        </div>
      </div>
    </div>
  </div>
  `,
  props: ['current'],
  data: () => {
    return {
      searchedData: null,
      keyword: '',
      waitEnter: 0,
    }
  },
  methods: {
    beforeEnter (el) {
      el.style.transitionDelay = 25 * parseInt(el.dataset.index, 10) + 'ms'
    },

    afterEnter (el) {
      el.style.transitionDelay = ''
    },

    getArtist (id, artist) {
      return this.$llctDatas.artist(id, artist)
    },

    getCoverURL (id) {
      return this.$llctDatas.base + '/cover/' + id
    },

    goSearch (v, skipLarge) {
      this.keyword = v

      let s = this.$llctDatas.search(v)

      if (skipLarge && s.length > 10) {
        return
      }

      this.searchedData = s
    },

    recommend (v) {
      console.log(v)
    }
  }
})
