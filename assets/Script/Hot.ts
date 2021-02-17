/**
 * Created by jsroads on 2019/11/4 . 11:40 上午
 * Note:
 */
const {ccclass, property} = cc._decorator;
@ccclass
export default class HotUpdate extends cc.Component {

    @property({
        type: cc.Asset
    })
    manifestUrl = null;

    @property({
        type:cc.Label
    })
    abc= null;
    onLoad() {
        this.abc.string = "1111sssw";
    }
}
